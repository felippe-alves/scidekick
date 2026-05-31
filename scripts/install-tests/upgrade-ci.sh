#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
ROOT_DIR="$(pwd)"
WORK_DIR="$(mktemp -d)"
TMP_WORK_DIR="$WORK_DIR/tmp"
mkdir -p "$TMP_WORK_DIR"
export TMPDIR="$TMP_WORK_DIR"
trap 'rm -rf "$WORK_DIR"' EXIT

REPO="${UPGRADE_TEST_REPO:-felippe-alves/scidekick}"
BASE_REF="${UPGRADE_TEST_BASE_REF:-v1.0.0}"
INSTALL_DIR="$WORK_DIR/bin"
RUNTIME_HOME="$WORK_DIR/home"
XDG_DATA_HOME_DIR="$WORK_DIR/xdg-data"
XDG_STATE_HOME_DIR="$WORK_DIR/xdg-state"
XDG_CACHE_HOME_DIR="$WORK_DIR/xdg-cache"
BASE_RELEASE_JSON="$WORK_DIR/base-release.json"
BASE_BINARY="$WORK_DIR/base-sk"
BASE_DIGEST_FILE="$WORK_DIR/base-digest.txt"
CURRENT_REF="v0.0.0-current"
CORRUPT_REF="v0.0.0-corrupt"

section() {
	echo ""
	echo "=== $1 ==="
}

host_binary_name() {
	local os arch platform normalized_arch suffix
	os="$(uname -s)"
	arch="$(uname -m)"
	case "$os" in
		Linux) platform="linux" ;;
		Darwin) platform="darwin" ;;
		*) echo "Unsupported OS: $os" >&2; exit 1 ;;
	esac
	case "$arch" in
		x86_64|amd64) normalized_arch="x64" ;;
		arm64|aarch64) normalized_arch="arm64" ;;
		*) echo "Unsupported architecture: $arch" >&2; exit 1 ;;
	esac
	suffix=""
	if [ "$platform" = "win32" ]; then
		suffix=".exe"
	fi
	printf 'sk-%s-%s%s\n' "$platform" "$normalized_arch" "$suffix"
}

sha256_file() {
	local file_path="$1"
	if command -v shasum >/dev/null 2>&1; then
		shasum -a 256 "$file_path" | sed 's/[[:space:]].*//'
	elif command -v sha256sum >/dev/null 2>&1; then
		sha256sum "$file_path" | sed 's/[[:space:]].*//'
	else
		echo "shasum or sha256sum is required" >&2
		exit 1
	fi
}

run_sk() {
	HOME="$RUNTIME_HOME" \
	XDG_DATA_HOME="$XDG_DATA_HOME_DIR" \
	XDG_STATE_HOME="$XDG_STATE_HOME_DIR" \
	XDG_CACHE_HOME="$XDG_CACHE_HOME_DIR" \
	"$INSTALL_DIR/sk" "$@"
}

smoke_installed() {
	run_sk --version
	run_sk --help >/dev/null
	run_sk --smoke-test
}

extract_release_field() {
	local field="$1"
	local asset_name="$2"
	bun -e '
		const [jsonPath, assetName, field] = process.argv.slice(1);
		const release = await Bun.file(jsonPath).json();
		const asset = release.assets?.find((candidate) => candidate.name === assetName);
		if (!asset) throw new Error(`Missing release asset ${assetName}`);
		const value = asset[field];
		if (typeof value !== "string" || value.length === 0) throw new Error(`Missing ${field} on ${assetName}`);
		process.stdout.write(value);
	' "$BASE_RELEASE_JSON" "$asset_name" "$field"
}

assert_version_changed() {
	local old_version="$1"
	local new_version
	new_version="$(run_sk --version)"
	if [ "$new_version" = "$old_version" ]; then
		echo "Upgrade did not change version: $new_version" >&2
		exit 1
	fi
}

assert_state_survived() {
	[ -f "$RUNTIME_HOME/.sk/agent/upgrade-sentinel" ] || { echo "Missing .sk upgrade sentinel" >&2; exit 1; }
	[ -f "$RUNTIME_HOME/.omp/agent/upgrade-sentinel" ] || { echo "Missing .omp upgrade sentinel" >&2; exit 1; }
}

install_current_with_fake_release() {
	local ref="$1"
	local test_binary="$2"
	local test_sha="$3"
	local fake_bin_dir="$WORK_DIR/fake-bin-$ref"
	mkdir -p "$fake_bin_dir"
	cat > "$fake_bin_dir/curl" <<'FAKECURL'
#!/usr/bin/env bash
set -euo pipefail

out=""
url=""
while [ "$#" -gt 0 ]; do
	case "$1" in
		-o)
			shift
			out="$1"
			;;
		http://*|https://*)
			url="$1"
			;;
	esac
	shift
done

case "$url" in
	*/releases/tags/v0.0.0-current)
		printf '{"tag_name":"v0.0.0-current"}'
		;;
	*/releases/tags/v0.0.0-corrupt)
		printf '{"tag_name":"v0.0.0-corrupt"}'
		;;
	*/releases/download/v0.0.0-current/*.sha256)
		[ -n "$out" ] || { echo "missing -o for checksum download" >&2; exit 1; }
		printf '%s  sk-darwin-arm64\n' "$OMP_TEST_SHA256" > "$out"
		;;
	*/releases/download/v0.0.0-current/*)
		[ -n "$out" ] || { echo "missing -o for binary download" >&2; exit 1; }
		cp "$OMP_TEST_BINARY" "$out"
		;;
	*/releases/download/v0.0.0-corrupt/*.sha256)
		[ -n "$out" ] || { echo "missing -o for checksum download" >&2; exit 1; }
		printf '%s  sk-darwin-arm64\n' "$OMP_TEST_SHA256" > "$out"
		;;
	*/releases/download/v0.0.0-corrupt/*)
		[ -n "$out" ] || { echo "missing -o for binary download" >&2; exit 1; }
		printf '#!/bin/sh\nexit 42\n' > "$out"
		;;
	*)
		echo "unexpected curl URL: $url" >&2
		exit 1
		;;
esac
FAKECURL
	chmod +x "$fake_bin_dir/curl"
	PATH="$fake_bin_dir:$PATH" SK_INSTALL_DIR="$INSTALL_DIR" OMP_TEST_BINARY="$test_binary" OMP_TEST_SHA256="$test_sha" sh scripts/install.sh --binary --ref "$ref"
}

section "Install published $BASE_REF binary"
mkdir -p "$INSTALL_DIR" "$RUNTIME_HOME/.sk/agent" "$RUNTIME_HOME/.omp/agent" "$XDG_DATA_HOME_DIR" "$XDG_STATE_HOME_DIR" "$XDG_CACHE_HOME_DIR"
BINARY_NAME="$(host_binary_name)"
curl -fsSL "https://api.github.com/repos/$REPO/releases/tags/$BASE_REF" -o "$BASE_RELEASE_JSON"
BASE_DOWNLOAD_URL="$(extract_release_field browser_download_url "$BINARY_NAME")"
BASE_DIGEST="$(extract_release_field digest "$BINARY_NAME")"
BASE_SHA="${BASE_DIGEST#sha256:}"
printf '%s' "$BASE_SHA" > "$BASE_DIGEST_FILE"
curl -fsSL "$BASE_DOWNLOAD_URL" -o "$BASE_BINARY"
if [ "$(sha256_file "$BASE_BINARY")" != "$BASE_SHA" ]; then
	echo "Downloaded $BASE_REF binary digest mismatch" >&2
	exit 1
fi
chmod +x "$BASE_BINARY"
mv "$BASE_BINARY" "$INSTALL_DIR/sk"
BASE_VERSION="$(run_sk --version)"
smoke_installed
printf 'state survives upgrades\n' > "$RUNTIME_HOME/.sk/agent/upgrade-sentinel"
printf 'state survives upgrades\n' > "$RUNTIME_HOME/.omp/agent/upgrade-sentinel"

section "Failed upgrade preserves existing install"
CURRENT_BINARY="$ROOT_DIR/packages/coding-agent/dist/sk"
if [ ! -x "$CURRENT_BINARY" ]; then
	bun --cwd=packages/natives run build
	bun --cwd=packages/coding-agent run build
fi
CURRENT_SHA="$(sha256_file "$CURRENT_BINARY")"
if install_current_with_fake_release "$CORRUPT_REF" "$CURRENT_BINARY" "$CURRENT_SHA"; then
	echo "Corrupt upgrade unexpectedly succeeded" >&2
	exit 1
fi
if [ "$(run_sk --version)" != "$BASE_VERSION" ]; then
	echo "Failed upgrade changed installed version" >&2
	exit 1
fi
smoke_installed
assert_state_survived

section "Upgrade to current build"
install_current_with_fake_release "$CURRENT_REF" "$CURRENT_BINARY" "$CURRENT_SHA"
assert_version_changed "$BASE_VERSION"
smoke_installed
run_sk doctor --json >/dev/null
assert_state_survived

echo ""
echo "Upgrade smoke tests passed"
