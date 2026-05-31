#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
ROOT_DIR="$(pwd)"
WORK_DIR="$(mktemp -d)"
TMP_WORK_DIR="$WORK_DIR/tmp"
mkdir -p "$TMP_WORK_DIR"
export TMPDIR="$TMP_WORK_DIR"
trap 'rm -rf "$WORK_DIR"' EXIT

section() {
   echo ""
   echo "=== $1 ==="
}

smoke_cli() {
   local sk_bin="$1"
   local runtime_dir
   runtime_dir="$(mktemp -d "$WORK_DIR/compiled-runtime.XXXXXX")"
   XDG_DATA_HOME="$runtime_dir/xdg" HOME="$runtime_dir/home" "$sk_bin" --version
   XDG_DATA_HOME="$runtime_dir/xdg" HOME="$runtime_dir/home" "$sk_bin" --help >/dev/null
   XDG_DATA_HOME="$runtime_dir/xdg" HOME="$runtime_dir/home" "$sk_bin" stats --summary >/dev/null
   # Spawns the stats sync worker via `new Worker(...)` and waits for a pong.
   # Regression probe for #1011 (browser tab worker) and #1027 (stats sync
   # worker) — both broke silently in compiled binaries because the `with
   # { type: "file" }` import pattern only copies the worker as a raw asset
   # without bundling its imports. `stats --summary` doesn't catch this on a
   # fresh install (no session files = no Worker spawn).
   XDG_DATA_HOME="$runtime_dir/xdg" HOME="$runtime_dir/home" "$sk_bin" --smoke-test
}

find_tarball() {
   local pattern="$1"
   local matches=()
   shopt -s nullglob
   matches=("$pattern")
   shopt -u nullglob

   if [ "${#matches[@]}" -ne 1 ]; then
      echo "Expected exactly one tarball matching: $pattern"
      exit 1
   fi

   echo "${matches[0]}"
}

section "Binary install smoke"
bun --cwd=packages/natives run build
bun --cwd=packages/coding-agent run build

BINARY_DIR="$WORK_DIR/binary-bin"
mkdir -p "$BINARY_DIR"
cp packages/coding-agent/dist/sk "$BINARY_DIR/sk"
smoke_cli "$BINARY_DIR/sk"

section "Installer script binary smoke"
INSTALL_SCRIPT_DIR="$WORK_DIR/script-install-bin"
FAKE_BIN_DIR="$WORK_DIR/fake-bin"
TEST_BINARY="$ROOT_DIR/packages/coding-agent/dist/sk"
TEST_BINARY_SHA="$(shasum -a 256 "$TEST_BINARY" | sed 's/[[:space:]].*//')"
mkdir -p "$FAKE_BIN_DIR"
cat > "$FAKE_BIN_DIR/curl" <<'FAKECURL'
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
	*/releases/tags/v0.0.0-test|*/releases/latest)
		printf '{"tag_name":"v0.0.0-test"}'
		;;
	*/releases/tags/v0.0.0-corrupt)
		printf '{"tag_name":"v0.0.0-corrupt"}'
		;;
	*/releases/tags/v0.0.0-missing-sha)
		printf '{"tag_name":"v0.0.0-missing-sha"}'
		;;
	*/releases/download/v0.0.0-test/*.sha256)
		[ -n "$out" ] || { echo "missing -o for checksum download" >&2; exit 1; }
		printf '%s  sk-darwin-arm64\n' "$SK_TEST_SHA256" > "$out"
		;;
	*/releases/download/v0.0.0-test/*)
		[ -n "$out" ] || { echo "missing -o for binary download" >&2; exit 1; }
		cp "$SK_TEST_BINARY" "$out"
		;;
	*/releases/download/v0.0.0-corrupt/*.sha256)
		[ -n "$out" ] || { echo "missing -o for checksum download" >&2; exit 1; }
		printf '%s  sk-darwin-arm64\n' "$SK_TEST_SHA256" > "$out"
		;;
	*/releases/download/v0.0.0-corrupt/*)
		[ -n "$out" ] || { echo "missing -o for binary download" >&2; exit 1; }
		printf '#!/bin/sh\nexit 42\n' > "$out"
		;;
	*/releases/download/v0.0.0-missing-sha/*.sha256)
		exit 22
		;;
	*/releases/download/v0.0.0-missing-sha/*)
		[ -n "$out" ] || { echo "missing -o for binary download" >&2; exit 1; }
		cp "$SK_TEST_BINARY" "$out"
		;;
	*)
		echo "unexpected curl URL: $url" >&2
		exit 1
		;;
esac
FAKECURL
chmod +x "$FAKE_BIN_DIR/curl"
PATH="$FAKE_BIN_DIR:$PATH" SK_INSTALL_DIR="$INSTALL_SCRIPT_DIR" SK_TEST_BINARY="$TEST_BINARY" SK_TEST_SHA256="$TEST_BINARY_SHA" sh scripts/install.sh --binary --ref v0.0.0-test
smoke_cli "$INSTALL_SCRIPT_DIR/sk"
printf '#!/bin/sh\nexit 99\n' > "$INSTALL_SCRIPT_DIR/sk"
chmod +x "$INSTALL_SCRIPT_DIR/sk"
PATH="$FAKE_BIN_DIR:$PATH" SK_INSTALL_DIR="$INSTALL_SCRIPT_DIR" SK_TEST_BINARY="$TEST_BINARY" SK_TEST_SHA256="$TEST_BINARY_SHA" sh scripts/install.sh --binary --ref v0.0.0-test
smoke_cli "$INSTALL_SCRIPT_DIR/sk"
if PATH="$FAKE_BIN_DIR:$PATH" SK_INSTALL_DIR="$INSTALL_SCRIPT_DIR" SK_TEST_BINARY="$TEST_BINARY" SK_TEST_SHA256="$TEST_BINARY_SHA" sh scripts/install.sh --binary --ref v0.0.0-corrupt; then
	echo "corrupt binary install unexpectedly succeeded" >&2
	exit 1
fi
smoke_cli "$INSTALL_SCRIPT_DIR/sk"
if PATH="$FAKE_BIN_DIR:$PATH" SK_INSTALL_DIR="$INSTALL_SCRIPT_DIR" SK_TEST_BINARY="$TEST_BINARY" SK_TEST_SHA256="$TEST_BINARY_SHA" sh scripts/install.sh --binary --ref v0.0.0-missing-sha; then
	echo "missing checksum install unexpectedly succeeded" >&2
	exit 1
fi
smoke_cli "$INSTALL_SCRIPT_DIR/sk"

section "Source install smoke"
SOURCE_BUN_HOME="$WORK_DIR/bun-source"
(
   export BUN_INSTALL="$SOURCE_BUN_HOME"
   export PATH="$BUN_INSTALL/bin:$PATH"
   bun --cwd="$ROOT_DIR/packages/coding-agent" link
   smoke_cli "$BUN_INSTALL/bin/sk"
)

section "Tarball install smoke"
TARBALL_DIR="$WORK_DIR/tarballs"
mkdir -p "$TARBALL_DIR"
host_tag="$(bun -e "process.stdout.write(\`\${process.platform}-\${process.arch}\`)")"

# Native addon split: the published core ships only the loader (no `.node`); the
# prebuilt binary lives in a per-platform leaf package pulled in as an optional
# dependency. Reproduce that exact published topology so this smoke proves the
# installed core resolves its addon through the leaf, not a bundled binary.

# 1. Generate + pack the host-platform leaf (carries the built `.node`).
bun --cwd=packages/natives run gen:npm --tag "$host_tag" >/dev/null
(
   cd "$ROOT_DIR/packages/natives/npm/$host_tag"
   bun pm pack --destination "$TARBALL_DIR" --quiet >/dev/null
)

# 2. Pack the core with its *published* manifest: the same rewrite release uses
#    drops `.node` from `files` and adds the leaf `optionalDependencies`. Always
#    restore the working-tree manifest so local runs aren't left mutated.
natives_pkg_backup="$WORK_DIR/natives-package.json.orig"
cp "$ROOT_DIR/packages/natives/package.json" "$natives_pkg_backup"
core_rc=0
{
   bun -e 'import { prepareNativeCorePackage } from "./scripts/ci-release-publish.ts"; await prepareNativeCorePackage("packages/natives", true);' &&
      (cd "$ROOT_DIR/packages/natives" && bun pm pack --destination "$TARBALL_DIR" --quiet >/dev/null)
} || core_rc=$?
cp "$natives_pkg_backup" "$ROOT_DIR/packages/natives/package.json"
[ "$core_rc" -eq 0 ] || exit "$core_rc"

# 3. Pack the remaining workspace packages (natives core handled above).
for pkg in utils hashline ai mnemopi agent tui stats coding-agent; do
   (
      cd "$ROOT_DIR/packages/$pkg"
      bun pm pack --destination "$TARBALL_DIR" --quiet >/dev/null
   )
done

utils_tgz="$(find_tarball "$TARBALL_DIR"/oh-my-pi-pi-utils-*.tgz)"
natives_tgz="$(find_tarball "$TARBALL_DIR"/oh-my-pi-pi-natives-[0-9]*.tgz)"
natives_leaf_tgz="$(find_tarball "$TARBALL_DIR"/oh-my-pi-pi-natives-"$host_tag"-*.tgz)"
hashline_tgz="$(find_tarball "$TARBALL_DIR"/oh-my-pi-hashline-*.tgz)"
ai_tgz="$(find_tarball "$TARBALL_DIR"/oh-my-pi-pi-ai-*.tgz)"
mnemopi_tgz="$(find_tarball "$TARBALL_DIR"/oh-my-pi-pi-mnemopi-*.tgz)"
agent_tgz="$(find_tarball "$TARBALL_DIR"/oh-my-pi-pi-agent-core-*.tgz)"
tui_tgz="$(find_tarball "$TARBALL_DIR"/oh-my-pi-pi-tui-*.tgz)"
stats_tgz="$(find_tarball "$TARBALL_DIR"/oh-my-pi-omp-stats-*.tgz)"
coding_agent_tgz="$(find_tarball "$TARBALL_DIR"/oh-my-pi-pi-coding-agent-*.tgz)"

TARBALL_APP_DIR="$WORK_DIR/tarball-install"
mkdir -p "$TARBALL_APP_DIR"
(
   cd "$TARBALL_APP_DIR"
   bun init -y >/dev/null

   # Write overrides so bun resolves inter-package deps from tarballs, not the registry
   # (version 12.x.y hasn't been published yet when CI runs pre-release)
   node -e "
		const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8'));
		pkg.overrides = {
			'@oh-my-pi/pi-utils': '$utils_tgz',
			'@oh-my-pi/pi-natives': '$natives_tgz',
			'@oh-my-pi/pi-natives-$host_tag': '$natives_leaf_tgz',
			'@oh-my-pi/hashline': '$hashline_tgz',
			'@oh-my-pi/pi-ai': '$ai_tgz',
			'@oh-my-pi/pi-mnemopi': '$mnemopi_tgz',
			'@oh-my-pi/pi-agent-core': '$agent_tgz',
			'@oh-my-pi/pi-tui': '$tui_tgz',
			'@oh-my-pi/omp-stats': '$stats_tgz',
			'@oh-my-pi/pi-coding-agent': '$coding_agent_tgz'
		};
		require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2));
	"

   bun add "$utils_tgz" "$natives_tgz" "$hashline_tgz" "$ai_tgz" "$mnemopi_tgz" "$agent_tgz" "$tui_tgz" "$stats_tgz" "$coding_agent_tgz"
   # The platform leaf must arrive through the core's optionalDependencies +
   # override, not as a direct dependency — assert it landed before smoking so a
   # resolution regression is distinguishable from a runtime loader bug.
   leaf_dir="node_modules/@oh-my-pi/pi-natives-$host_tag"
   [ -d "$leaf_dir" ] || {
      echo "Platform leaf package not installed: $leaf_dir"
      exit 1
   }
   smoke_cli ./node_modules/.bin/sk
)

echo ""
echo "All install method smoke tests passed"
