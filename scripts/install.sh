#!/usr/bin/env bash
# Proxync Universal One-Line Installer (Linux & macOS)
# Usage:
#   curl -fsSL https://proxync.dev/install.sh | bash
#   curl -fsSL https://proxync.dev/install.sh | bash -s -- --gui
set -euo pipefail

INSTALL_GUI=false
VERSION="${VERSION:-}"
for arg in "$@"; do
    case "$arg" in
        --gui) INSTALL_GUI=true ;;
        --version=*) VERSION="${arg#*=}" ;;
    esac
done

REPO="Inilax/Proxync"
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
    x86_64|amd64) ARCH="x86_64" ;;
    aarch64|arm64) ARCH="aarch64" ;;
    *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

IS_WINDOWS=false
BIN_NAME="proxync"

case "${OS}" in
    darwin*)
        CLI_ASSET="proxync-darwin-universal.tar.gz"
        IS_ARCHIVE=true
        ;;
    linux*)
        CLI_ASSET="proxync-linux-${ARCH}.tar.gz"
        IS_ARCHIVE=true
        ;;
    mingw*|msys*|cygwin*)
        CLI_ASSET="proxync-windows-${ARCH}.exe"
        IS_ARCHIVE=false
        IS_WINDOWS=true
        BIN_NAME="proxync.exe"
        ;;
    *)
        echo "Unsupported operating system: ${OS}" >&2
        exit 1
        ;;
esac

echo -e "\033[1;36m==> Installing Proxync for ${OS}-${ARCH}...\033[0m"

# Auto-resolve latest release version if not explicitly passed
if [ -z "${VERSION}" ]; then
    VERSION=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null | grep '"tag_name":' | head -1 | cut -d '"' -f 4 || true)
    if [ -z "${VERSION}" ]; then
        VERSION=$(curl -fsSL "https://github.com/${REPO}/releases/latest/download/latest.json" 2>/dev/null | grep -o '"version": *"[^"]*"' | head -1 | cut -d '"' -f 4 || true)
        if [ -n "${VERSION}" ] && [[ "${VERSION}" != v* ]]; then
            VERSION="v${VERSION}"
        fi
    fi
fi

# Target installation directory for CLI
if [ "${IS_WINDOWS}" = true ] && [ -n "${LOCALAPPDATA:-}" ] && command -v cygpath >/dev/null 2>&1; then
    BIN_DIR="$(cygpath -u "${LOCALAPPDATA}")/Programs/Proxync/bin"
    mkdir -p "${BIN_DIR}"
elif [ -w "/usr/local/bin" ]; then
    BIN_DIR="/usr/local/bin"
else
    BIN_DIR="${HOME}/.local/bin"
    mkdir -p "${BIN_DIR}"
fi

if [ -n "${VERSION}" ]; then
    CLI_URL="https://github.com/${REPO}/releases/download/${VERSION}/${CLI_ASSET}"
    echo "==> Fetching Proxync CLI (${VERSION})..."
else
    CLI_URL="https://github.com/${REPO}/releases/latest/download/${CLI_ASSET}"
    echo "==> Fetching latest Proxync CLI..."
fi
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

if [ "${IS_ARCHIVE}" = true ]; then
    if curl -fsSL "${CLI_URL}" -o "${TMP_DIR}/proxync.tar.gz" 2>/dev/null; then
        tar -xzf "${TMP_DIR}/proxync.tar.gz" -C "${TMP_DIR}"
        chmod +x "${TMP_DIR}/${BIN_NAME}"
        mv "${TMP_DIR}/${BIN_NAME}" "${BIN_DIR}/${BIN_NAME}"
    else
        # Fallback to local cargo build if running in cloned repo
        if [ -f "packages/cli/Cargo.toml" ]; then
            echo "Release asset not found. Building locally via cargo..."
            cargo build --release --manifest-path="packages/cli/Cargo.toml"
            cp "packages/cli/target/release/${BIN_NAME}" "${BIN_DIR}/${BIN_NAME}"
        elif [ "${OS}" = "linux" ] && [ "${ARCH}" = "aarch64" ]; then
            echo -e "\033[33mNotice: Prebuilt binary for Linux aarch64 is not yet distributed in releases.\033[0m"
            if command -v cargo >/dev/null 2>&1; then
                echo "Installing directly via cargo..."
                cargo install --git "https://github.com/${REPO}.git" --package proxync-cli --bin proxync
                INSTALLED_BIN="$(command -v proxync || true)"
                if [ -n "${INSTALLED_BIN}" ] && [ -f "${INSTALLED_BIN}" ]; then
                    mkdir -p "${BIN_DIR}"
                    cp "${INSTALLED_BIN}" "${BIN_DIR}/${BIN_NAME}"
                fi
            else
                echo -e "\033[31mError: Linux ARM64 requires cargo to build from source.\033[0m" >&2
                echo "Install Rust via https://rustup.rs and run: cargo install --git https://github.com/${REPO}.git --package proxync-cli" >&2
                exit 1
            fi
        else
            echo "Error: Could not download release archive from ${CLI_URL}" >&2
            exit 1
        fi
    fi
else
    # Standalone binary (.exe on Windows)
    if curl -fsSL "${CLI_URL}" -o "${TMP_DIR}/${BIN_NAME}" 2>/dev/null; then
        chmod +x "${TMP_DIR}/${BIN_NAME}"
        mv "${TMP_DIR}/${BIN_NAME}" "${BIN_DIR}/${BIN_NAME}"
    else
        if [ -f "packages/cli/Cargo.toml" ]; then
            echo "Release asset not found. Building locally via cargo..."
            cargo build --release --manifest-path="packages/cli/Cargo.toml"
            cp "packages/cli/target/release/${BIN_NAME}" "${BIN_DIR}/${BIN_NAME}"
        else
            echo "Error: Could not download release binary from ${CLI_URL}" >&2
            exit 1
        fi
    fi
fi

# Run setup-path on Windows to register PATH in registry
if [ "${IS_WINDOWS}" = true ]; then
    "${BIN_DIR}/${BIN_NAME}" setup-path >/dev/null 2>&1 || true
fi

echo -e "\033[1;32m[OK] Proxync CLI installed to ${BIN_DIR}/${BIN_NAME}\033[0m"

# Install Desktop GUI if requested
if [ "${INSTALL_GUI}" = true ]; then
    echo -e "\033[1;36m==> Installing Proxync Desktop GUI...\033[0m"
    if [ "${OS}" = "darwin" ]; then
        if [ -n "${VERSION}" ]; then
            DMG_VER="${VERSION#v}"
            # Check universal DMG first, then arch-specific DMG
            DMG_URL="https://github.com/${REPO}/releases/download/${VERSION}/Proxync_${DMG_VER}_universal.dmg"
            echo "Downloading ${DMG_URL}..."
            if ! curl -fsSL "${DMG_URL}" -o "${TMP_DIR}/Proxync.dmg" 2>/dev/null; then
                DMG_URL="https://github.com/${REPO}/releases/download/${VERSION}/Proxync_${DMG_VER}_${ARCH}.dmg"
                curl -fsSL "${DMG_URL}" -o "${TMP_DIR}/Proxync.dmg" || true
            fi
        else
            echo "Could not resolve latest release version for Desktop GUI."
        fi
        if [ -f "${TMP_DIR}/Proxync.dmg" ]; then
            mkdir -p "${TMP_DIR}/mnt"
            hdiutil attach "${TMP_DIR}/Proxync.dmg" -nobrowse -mountpoint "${TMP_DIR}/mnt"
            cp -R "${TMP_DIR}/mnt/Proxync.app" /Applications/
            hdiutil detach "${TMP_DIR}/mnt"
            echo -e "\033[1;32m[OK] Proxync.app installed to /Applications\033[0m"
        else
            echo "Desktop release asset not available yet. Build locally with: npm run tauri build"
        fi
    elif [ "${OS}" = "linux" ]; then
        if [ -n "${VERSION}" ]; then
            APPIMAGE_NAME="proxync_${VERSION#v}_amd64.AppImage"
            APPIMAGE_URL="https://github.com/${REPO}/releases/download/${VERSION}/${APPIMAGE_NAME}"
            echo "Downloading ${APPIMAGE_URL}..."
            curl -fsSL "${APPIMAGE_URL}" -o "${BIN_DIR}/proxync-desktop" || true
        fi
        if [ -f "${BIN_DIR}/proxync-desktop" ]; then
            chmod +x "${BIN_DIR}/proxync-desktop"
            echo -e "\033[1;32m[OK] Proxync Desktop installed to ${BIN_DIR}/proxync-desktop\033[0m"
        fi
    fi
fi

# Ensure bin dir in PATH hint
case ":${PATH}:" in
    *:"${BIN_DIR}":*) ;;
    *) echo -e "\n\033[33mNote: Add ${BIN_DIR} to your PATH by adding this to ~/.bashrc or ~/.zshrc:\033[0m\n  export PATH=\"${BIN_DIR}:\$PATH\"" ;;
esac

echo -e "\n\033[1;32mDone!\033[0m Try running: \033[1mproxync --help\033[0m or \033[1mproxync scan\033[0m"
