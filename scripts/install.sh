#!/bin/sh
set -e

# Scidekick Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/felippe-alves/scidekick/main/scripts/install.sh | sh
#
# Options:
#   --source       Install via bun (installs bun if needed)
#   --binary       Always install prebuilt binary
#   --ref <ref>    Install specific tag/commit/branch
#   -r <ref>       Shorthand for --ref

REPO="felippe-alves/scidekick"
PACKAGE="@scidekick/cli"
INSTALL_DIR="${SK_INSTALL_DIR:-$HOME/.local/bin}"
MIN_BUN_VERSION="1.3.14"

die() {
    echo "Error: $*" >&2
    exit 1
}

github_api_get() {
    url="$1"
    token="${GITHUB_TOKEN:-${GH_TOKEN:-}}"
    if [ -n "$token" ]; then
        curl -fsSL -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" "$url"
    else
        curl -fsSL "$url"
    fi
}

has_curl() {
    command -v curl >/dev/null 2>&1
}

compute_sha256() {
    file_path="$1"
    if command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$file_path" | sed 's/[[:space:]].*//'
    elif command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$file_path" | sed 's/[[:space:]].*//'
    elif command -v openssl >/dev/null 2>&1; then
        openssl dgst -sha256 -r "$file_path" | sed 's/[[:space:]].*//'
    else
        die "shasum, sha256sum, or openssl is required to verify release checksums"
    fi
}

verify_sha256() {
    file_path="$1"
    checksum_file="$2"
    artifact_name="$3"

    expected_sha256="$(sed -n '1s/[[:space:]].*//p' "$checksum_file")"
    case "$expected_sha256" in
        ""|*[!0123456789abcdefABCDEF]*)
            die "Invalid checksum file for ${artifact_name}"
            ;;
    esac
    if [ "${#expected_sha256}" -ne 64 ]; then
        die "Invalid checksum length for ${artifact_name}"
    fi

    actual_sha256="$(compute_sha256 "$file_path")"
    if [ "$actual_sha256" != "$expected_sha256" ]; then
        die "Checksum verification failed for ${artifact_name}"
    fi
}

verify_executable() {
    bin_path="$1"
    label="$2"

    if ! "$bin_path" --version >/dev/null 2>&1; then
        die "Installed ${label} at ${bin_path} did not run --version"
    fi

    if ! "$bin_path" --smoke-test >/dev/null 2>&1; then
        die "Installed ${label} at ${bin_path} failed the worker smoke test"
    fi
}

# Parse arguments
MODE=""
REF=""
while [ $# -gt 0 ]; do
    case "$1" in
        --source)
            MODE="source"
            shift
            ;;
        --binary)
            MODE="binary"
            shift
            ;;
        --ref)
            shift
            if [ -z "$1" ]; then
                die "Missing value for --ref"
            fi
            REF="$1"
            shift
            ;;
        --ref=*)
            REF="${1#*=}"
            if [ -z "$REF" ]; then
                die "Missing value for --ref"
            fi
            shift
            ;;
        -r)
            shift
            if [ -z "$1" ]; then
                die "Missing value for -r"
            fi
            REF="$1"
            shift
            ;;
        *)
            die "Unknown option: $1"
            ;;
    esac
done

# If a ref is provided, default to source install
if [ -n "$REF" ] && [ -z "$MODE" ]; then
    MODE="source"
fi

# Check if bun is available
has_bun() {
    command -v bun >/dev/null 2>&1
}

version_ge() {
    current="$1"
    minimum="$2"

    current_major="${current%%.*}"
    current_rest="${current#*.}"
    current_minor="${current_rest%%.*}"
    current_patch="${current_rest#*.}"
    current_patch="${current_patch%%.*}"

    minimum_major="${minimum%%.*}"
    minimum_rest="${minimum#*.}"
    minimum_minor="${minimum_rest%%.*}"
    minimum_patch="${minimum_rest#*.}"
    minimum_patch="${minimum_patch%%.*}"

    if [ "$current_major" -ne "$minimum_major" ]; then
        [ "$current_major" -gt "$minimum_major" ]
        return $?
    fi

    if [ "$current_minor" -ne "$minimum_minor" ]; then
        [ "$current_minor" -gt "$minimum_minor" ]
        return $?
    fi

    [ "$current_patch" -ge "$minimum_patch" ]
}

require_bun_version() {
    version_raw=$(bun --version 2>/dev/null || true)
    if [ -z "$version_raw" ]; then
        die "Failed to read bun version"
    fi

    version_clean=${version_raw%%-*}
    if ! version_ge "$version_clean" "$MIN_BUN_VERSION"; then
        echo "Bun ${MIN_BUN_VERSION} or newer is required. Current version: ${version_clean}"
        die "Upgrade Bun at https://bun.sh/docs/installation"
    fi
}

# Check if git is available
has_git() {
    command -v git >/dev/null 2>&1
}

# Install bun
install_bun() {
    if ! has_curl; then
        die "curl is required to install Bun"
    fi
    echo "Installing bun..."
    if command -v bash >/dev/null 2>&1; then
        curl -fsSL https://bun.sh/install | bash
    else
        echo "bash not found; attempting install with sh..."
        curl -fsSL https://bun.sh/install | sh
    fi
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    require_bun_version
}

# Check if git-lfs is available
has_git_lfs() {
    command -v git-lfs >/dev/null 2>&1
}

# Install via bun
install_via_bun() {
    echo "Installing from source via bun..."
    if ! has_git; then
        die "git is required for source installs"
    fi

    SOURCE_REF="${REF:-main}"
    TMP_DIR="$(mktemp -d)"
    trap 'rm -rf "$TMP_DIR"' EXIT

    if git clone --depth 1 --branch "$SOURCE_REF" "https://github.com/${REPO}.git" "$TMP_DIR" >/dev/null 2>&1; then
        :
    else
        git clone "https://github.com/${REPO}.git" "$TMP_DIR"
        (cd "$TMP_DIR" && git checkout "$SOURCE_REF")
    fi

    # Pull LFS files
    if has_git_lfs; then
        (cd "$TMP_DIR" && git lfs pull)
    fi

    if [ ! -d "$TMP_DIR/packages/coding-agent" ]; then
        die "Expected package at ${TMP_DIR}/packages/coding-agent"
    fi

    bun install -g "$TMP_DIR/packages/coding-agent" || die "Failed to install from source"
    if command -v sk >/dev/null 2>&1; then
        verify_executable "$(command -v sk)" "sk"
    fi
    echo "✓ Installed sk via bun"
    echo "Run 'sk' to get started!"
}

# Install binary from GitHub releases
install_binary() {
    # Detect platform
    OS="$(uname -s)"
    ARCH="$(uname -m)"

    case "$OS" in
        Linux)  PLATFORM="linux" ;;
        Darwin) PLATFORM="darwin" ;;
        *)      die "Unsupported OS: $OS" ;;
    esac

    case "$ARCH" in
        x86_64|amd64)  ARCH="x64" ;;
        arm64|aarch64) ARCH="arm64" ;;
        *)             die "Unsupported architecture: $ARCH" ;;
    esac

    BINARY="sk-${PLATFORM}-${ARCH}"
    if ! has_curl; then
        die "curl is required to download release binaries"
    fi
    # Get release tag
    if [ -n "$REF" ]; then
        echo "Fetching release $REF..."
        if RELEASE_JSON=$(github_api_get "https://api.github.com/repos/${REPO}/releases/tags/${REF}"); then
            LATEST=$(echo "$RELEASE_JSON" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')
        else
            echo "Release tag not found: $REF"
            die "For branch/commit installs, use --source with --ref."
        fi
    else
        echo "Fetching latest release..."
        RELEASE_JSON=$(github_api_get "https://api.github.com/repos/${REPO}/releases/latest")
        LATEST=$(echo "$RELEASE_JSON" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')
    fi

    if [ -z "$LATEST" ]; then
        die "Failed to fetch release tag"
    fi
    echo "Using version: $LATEST"

    mkdir -p "$INSTALL_DIR"
    # Download binary and checksum to temporary files before replacing an existing install
    BINARY_URL="https://github.com/${REPO}/releases/download/${LATEST}/${BINARY}"
    CHECKSUM_URL="${BINARY_URL}.sha256"
    echo "Downloading ${BINARY}..."
    TMP_BINARY="$(mktemp "$INSTALL_DIR/.${BINARY}.XXXXXX")"
    TMP_CHECKSUM="$(mktemp "$INSTALL_DIR/.${BINARY}.sha256.XXXXXX")"
    if ! curl -fsSL "$BINARY_URL" -o "$TMP_BINARY"; then
        rm -f "$TMP_BINARY" "$TMP_CHECKSUM"
        die "Failed to download ${BINARY_URL}"
    fi
    if ! curl -fsSL "$CHECKSUM_URL" -o "$TMP_CHECKSUM"; then
        rm -f "$TMP_BINARY" "$TMP_CHECKSUM"
        die "Failed to download ${CHECKSUM_URL}"
    fi
    verify_sha256 "$TMP_BINARY" "$TMP_CHECKSUM" "$BINARY"
    rm -f "$TMP_CHECKSUM"
    chmod +x "$TMP_BINARY"
    verify_executable "$TMP_BINARY" "downloaded sk"
    mv "$TMP_BINARY" "${INSTALL_DIR}/sk"
    echo ""
    echo "✓ Installed sk to ${INSTALL_DIR}/sk"

    # Check if in PATH
    case ":$PATH:" in
        *":$INSTALL_DIR:"*) echo "Run 'sk' to get started!" ;;
        *) echo "Add ${INSTALL_DIR} to your PATH, then run 'sk'" ;;
    esac
}

# Main logic
case "$MODE" in
    source)
        if ! has_bun; then
            install_bun
        fi
        require_bun_version
        install_via_bun
        ;;
    binary)
        install_binary
        ;;
    *)
        # Default: install the published GitHub release binary. npm publishing is not enabled yet.
        install_binary
        ;;
esac
