# Piik Desktop

[![Version](https://img.shields.io/badge/version-0.2.0-blue)](https://github.com/Raqtpie/Piik-Desktop/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-44.7.0-47848f)](https://www.electronjs.org/)

A community desktop client for [Piik](https://github.com/TNTcraftHIM/Piik) on Windows and macOS.

[English](README.md) · [简体中文](README.zh-CN.md)

## Overview

Piik Desktop wraps Piik's official room and native sharing experience in an Electron app for Windows and macOS. Its launcher offers **Local Room**, **Public Invite**, and **Connect to Site** without opening an external browser.

This is an independent community project, not an official Piik release. Piik is developed by TNTcraft and its contributors. Desktop **0.2.0** locks the bundled Piik App and Browser UI to **v2.1.0** (signaling `piik-v24`), which is protocol-compatible with 2.0.x but still incompatible with 1.x. See [Vendor Frontend](docs/VENDOR-FRONTEND.md).

## Features

- Native launcher with English/Chinese, light/dark themes, and recent-site history.
- Window, screen, and camera source selection; browser sharing is removed in desktop mode.
- Native source previews in Piik's existing selection cards.
- An explicit **Create link** action when no invitation exists, and **Rotate link** when one does.
- Working copy actions, a complete connection-loading screen, and app-styled confirmation dialogs.
- LAN selection when multiple network adapters are active, tray behavior, and diagnostics.
- Isolated remote content with sandboxing, context isolation, and origin-scoped permissions.

## Download

Download release artifacts from [GitHub Releases](https://github.com/Raqtpie/Piik-Desktop/releases). Windows builds produce an NSIS `.exe`; macOS targets produce `.dmg` and `.zip` files.

Windows is the currently tested platform. macOS x64 and arm64 packages have compiled successfully in CI; native capture permissions, camera and audio behavior still require testing on a physical Mac. See [validation status](docs/VALIDATION.md).

## Build from source

Requirements:

- Node.js **22.14+** and npm; use a maintained Node.js release.
- Windows 10/11 x64 for Windows builds, or macOS 13+ on the matching Intel/Apple Silicon architecture for Mac builds.
- Xcode command line tools (`xcrun`, `swiftc`) for the macOS native preview helper.
- Network access to npm and official GitHub release assets.

```bash
git clone https://github.com/Raqtpie/Piik-Desktop.git
cd Piik-Desktop
npm ci
npm run check
npm run upstream:prepare
npm start
```

Create an installer for the current platform/architecture:

```bash
npm run dist
```

`npm run pack` creates an unpacked app for testing. Build on the target platform and prepare upstream assets for that same architecture. Unsigned macOS builds use `CSC_IDENTITY_AUTO_DISCOVERY=false` in the environment. For supported matrix builds, see [GitHub Actions](.github/workflows/build-desktop.yml).

The preparation script verifies the official Piik release archive with a pinned SHA-256 checksum and checks that in-repo `vendor/frontend` matches the same Core pin (one Core version ↔ one frontend). On Windows it keeps the official helper unchanged. On macOS it still builds Desktop’s MIT helper with the missing `--preview` command (upstream still lacks it; `native/darwin` was not rewritten for this pin). [Native source provenance](native/darwin/PROVENANCE.md). [Vendor Frontend](docs/VENDOR-FRONTEND.md).

## Usage

1. Choose **Local Room**, **Public Invite**, or **Connect to Site**. Site mode requires a root HTTPS URL; HTTP is accepted only for localhost.
2. Enter Piik and select a native sharing source. Device access may require OS approval.
3. For invitations, click **Create link** if none exists. Creating and rotating use Piik's original handler; the desktop app does not silently create invitation credentials.
4. **Home** stops the active Core and sharing session. **Refresh** reloads the connected page. **Logs** opens local diagnostics.

A new installation has no preset site. Up to five recent sites are kept in the app's user-data directory. Redirects to changed origins require confirmation unless the user enables automatic HTTPS redirects on the launcher. Do not share diagnostic files without reviewing them.

## Development

| Command | Purpose |
| --- | --- |
| `npm start` | Run the app |
| `npm run dev` | Run with development tools available |
| `npm run check` | Run tests and JavaScript syntax checks |
| `npm run upstream:prepare` | Verify vendor/frontend, then download and verify Piik App; build the Mac helper when needed |
| `npm run frontend:sync` | Refresh the in-repo Browser UI vendor for the current Core pin |
| `npm run frontend:verify` | Verify vendor/frontend matches the Core pin and file checksums |
| `npm run pack` | Build an unpacked app |
| `npm run dist` | Build an installer/archive |

```text
src/                   Electron lifecycle, launcher, dialogs and UI adapters
native/darwin/         Pinned macOS capture helper plus the preview fix
scripts/               Upstream Core prepare + frontend vendor sync
vendor/frontend/       Browser UI locked to the same Core tag (committed)
tests/                 Permissions, navigation, UI and process lifecycle tests
.github/workflows/     Windows and macOS build jobs
assets/                App icons
licenses/              Upstream license notices
```

Generated dependencies, upstream binaries, build caches, installers and personal configuration are excluded by `.gitignore`. Please report reproducible problems through [Issues](https://github.com/Raqtpie/Piik-Desktop/issues); include your OS, app version, mode and sanitized diagnostics. See [Contributing](CONTRIBUTING.md).

## Upstream pin and upgrade path

- **Current pin**: Piik **v2.1.0** Core + matching `vendor/frontend`.
- **From Desktop 0.1.0 / Piik 1.x Site**: upgrade the whole stack to 2.x. Mixed 1.x/2.x sessions cannot join.
- **2.0.x → 2.1.0**: protocol/DB compatible (still `piik-v24`); Desktop 0.2.0 bundles Piik 2.1.0.
- Refreshing the vendor tree: [docs/VENDOR-FRONTEND.md](docs/VENDOR-FRONTEND.md).

## Limitations

- Installers are unsigned. No signing certificate or notarization is included.
- macOS runtime verification is pending; automated JavaScript tests cannot establish native capture behavior.
- UI adapters originally targeted Piik v1.9.2 markup; re-check them against **v2.1.0** on device.
- **Piik 2.0 is incompatible with 1.x** (`piik-v23`→`piik-v24`). Connect only to compatible 2.x sites; App and Site must upgrade together.
- Piik's native Core owns capture, audio and WebRTC transport. Public invitation availability depends on its upstream tunnel service.
- There is no automatic update service or telemetry added by the desktop shell.

## License and credits

Piik Desktop is [MIT licensed](LICENSE), Copyright (c) 2026 Piik community contributors. Piik and the included native helper sources are separately MIT licensed by their upstream authors. See [upstream notices](LICENSE-UPSTREAM.md) and [Piik's license](licenses/piik-license.txt). Thanks to [TNTcraftHIM/Piik](https://github.com/TNTcraftHIM/Piik) and its contributors.
