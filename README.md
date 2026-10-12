# Piik Desktop

[![Version](https://img.shields.io/badge/version-0.1.0-blue)](https://github.com/Raqtpie/Piik-Desktop/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-44.7.0-47848f)](https://www.electronjs.org/)

A community desktop app for [Piik](https://github.com/TNTcraftHIM/Piik), maintained by [Raqtpie](https://github.com/Raqtpie) and the Piik community.

[English](#english) · [简体中文](#简体中文)

## English

### Overview

Piik Desktop wraps Piik's official room and native sharing experience in an Electron app for Windows and macOS. Its launcher offers **Local Room**, **Public Invite**, and **Connect to Site** without opening an external browser.

This is an independent community project, not an official Piik release. Piik is developed by TNTcraft and its contributors. Desktop release **0.1.0** is the first public version; the bundled Piik App is pinned to **v1.9.2**.

### Features

- Native launcher with English/Chinese, light/dark themes, and recent-site history.
- Window, screen, and camera source selection; browser sharing is removed in desktop mode.
- Native source previews in Piik's existing selection cards.
- An explicit **Create link** action when no invitation exists, and **Rotate link** when one does.
- Working copy actions, a complete connection-loading screen, and app-styled confirmation dialogs.
- LAN selection when multiple network adapters are active, tray behavior, and diagnostics.
- Isolated remote content with sandboxing, context isolation, and origin-scoped permissions.

### Download

Release artifacts will be available on [GitHub Releases](https://github.com/Raqtpie/Piik-Desktop/releases) after publication. Windows builds produce an NSIS `.exe`; macOS targets produce `.dmg` and `.zip` files.

Windows is the currently tested platform. macOS x64 and arm64 packages have compiled successfully in CI; native capture permissions, camera and audio behavior still require testing on a physical Mac. See [validation status](docs/VALIDATION.md).

### Build from source

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

The preparation script verifies the official Piik release archive with a pinned SHA-256 checksum. On Windows it keeps the official helper unchanged. On macOS it builds the pinned MIT-licensed helper source with the missing `--preview` command added; the Go/React source remains unchanged. [Native source provenance](native/darwin/PROVENANCE.md).

### Usage

1. Choose **Local Room**, **Public Invite**, or **Connect to Site**. Site mode requires a root HTTPS URL; HTTP is accepted only for localhost.
2. Enter Piik and select a native sharing source. Device access may require OS approval.
3. For invitations, click **Create link** if none exists. Creating and rotating use Piik's original handler; the desktop app does not silently create invitation credentials.
4. **Home** stops the active Core and sharing session. **Refresh** reloads the connected page. **Logs** opens local diagnostics.

A new installation has no preset site. Up to five recent sites are kept in the app's user-data directory. Redirects to changed origins require confirmation unless the user enables automatic HTTPS redirects on the launcher. Do not share diagnostic files without reviewing them.

### Development

| Command | Purpose |
| --- | --- |
| `npm start` | Run the app |
| `npm run dev` | Run with development tools available |
| `npm run check` | Run tests and JavaScript syntax checks |
| `npm run upstream:prepare` | Download and verify Piik App assets; build the Mac helper when needed |
| `npm run pack` | Build an unpacked app |
| `npm run dist` | Build an installer/archive |

```text
src/                   Electron lifecycle, launcher, dialogs and UI adapters
native/darwin/         Pinned macOS capture helper plus the preview fix
scripts/               Upstream asset preparation
tests/                 Permissions, navigation, UI and process lifecycle tests
.github/workflows/     Windows and macOS build jobs
assets/                App icons
licenses/              Upstream license notices
```

Generated dependencies, upstream binaries, build caches, installers and personal configuration are excluded by `.gitignore`. Please report reproducible problems through [Issues](https://github.com/Raqtpie/Piik-Desktop/issues); include your OS, app version, mode and sanitized diagnostics. See [Contributing](CONTRIBUTING.md).

### Limitations

- Installers are unsigned. No signing certificate or notarization is included.
- macOS runtime verification is pending; automated JavaScript tests cannot establish native capture behavior.
- UI adapters target Piik v1.9.2 markup and need review when upgrading Piik.
- Piik's native Core owns capture, audio and WebRTC transport. Public invitation availability depends on its upstream tunnel service.
- There is no automatic update service or telemetry added by the desktop shell.

### License and credits

Piik Desktop is [MIT licensed](LICENSE), Copyright (c) 2026 Piik community contributors. Piik and the included native helper sources are separately MIT licensed by their upstream authors. See [upstream notices](LICENSE-UPSTREAM.md) and [Piik's license](licenses/piik-license.txt). Thanks to [TNTcraftHIM/Piik](https://github.com/TNTcraftHIM/Piik) and its contributors.

## 简体中文

### 项目简介

Piik Desktop 是由 [Raqtpie](https://github.com/Raqtpie) 与 Piik community 维护的社区桌面客户端。它将 Piik 官方房间页面与原生分享能力集成到 Electron 应用中，提供 **本地房间、公网邀请、连接站点** 三种入口，无需打开外部浏览器。

本项目为独立社区项目，并非 Piik 官方发行版。Piik 由 TNTcraft 与贡献者开发。桌面端 **0.1.0** 为首个公开版本，内置 Piik App 固定为 **v1.9.2**。

### 功能

- 中英文、明暗主题、最近站点记录和独立桌面启动页。
- 程序／窗口、屏幕、摄像头来源选择；桌面模式移除浏览器分享。
- 在 Piik 原有选择卡中显示原生来源预览。
- 无邀请链接时显示「创建链接」，已有链接时显示「更新链接」。
- 链接与房间号复制、完整的连接加载界面、自定义确认弹窗。
- 多网卡选择、托盘行为与本地诊断日志。
- 远程内容启用沙箱、上下文隔离和按当前站点限定的权限。

### 下载与平台状态

发布后可在 [GitHub Releases](https://github.com/Raqtpie/Piik-Desktop/releases) 下载。Windows 构建生成 NSIS `.exe` 安装包，macOS 目标生成 `.dmg` 与 `.zip`。

当前已在 Windows 验证。macOS x64 与 arm64 安装包已完成 CI 编译，但捕获权限、摄像头和音频仍需在实体 Mac 上验证。完整范围见 [验证记录](docs/VALIDATION.md)。

### 源码构建

需要 Node.js **22.14+**、npm，以及 npm 和 GitHub 官方发行资源的网络访问。Windows 构建使用 Windows 10/11 x64；Mac 构建使用 macOS 13+ 和匹配的机器架构，并安装 Xcode 命令行工具。

```bash
git clone https://github.com/Raqtpie/Piik-Desktop.git
cd Piik-Desktop
npm ci
npm run check
npm run upstream:prepare
npm start
```

在当前平台生成安装包：

```bash
npm run dist
```

`npm run pack` 生成未打包安装器的测试应用目录。请在目标平台、对应架构上准备上游资源与构建；未签名 macOS 构建需设置环境变量 `CSC_IDENTITY_AUTO_DISCOVERY=false`。构建矩阵见 [GitHub Actions](.github/workflows/build-desktop.yml)。

准备脚本使用固定 SHA-256 校验 Piik 官方发行包。Windows 保留官方捕获助手；macOS 从固定的 MIT 源码构建助手，补上缺失的 `--preview` 命令。Go 与 React 源码保持原样。见 [原生源码来源说明](native/darwin/PROVENANCE.md)。

### 使用方法

1. 选择本地房间、公网邀请或连接站点。站点需要填写 HTTPS 根地址；HTTP 仅接受 localhost。
2. 进入 Piik，选择原生分享来源；首次设备访问可能需要系统授权。
3. 无邀请链接时点击「创建链接」。创建与更新继续使用 Piik 原有操作，桌面端不会自动创建邀请凭据。
4. 「首页」会停止 Core、房间连接与分享；「刷新」重新加载当前页面；「日志」打开本地诊断目录。

新安装不会预填站点，最多保留五条最近站点。站点地址变化默认需要确认，用户可在启动页开启受信任 HTTPS 站点的自动跳转。对外提供诊断文件前，请先检查内容。

### 开发与贡献

`npm run dev` 开启开发模式，`npm run check` 执行测试和语法检查。项目结构和其他命令见上方英文开发部分。

依赖、上游二进制、构建缓存、安装包和个人配置均由 `.gitignore` 排除。欢迎通过 [Issues](https://github.com/Raqtpie/Piik-Desktop/issues) 提交问题，请提供系统、应用版本、连接模式和已去除敏感信息的诊断。贡献说明见 [CONTRIBUTING.md](CONTRIBUTING.md)。

### 已知限制

- 安装包未签名，项目未包含签名证书或 macOS 公证。
- macOS 实机验证尚未完成，JavaScript 测试无法证明原生设备链路正常。
- 界面适配针对 Piik v1.9.2；升级上游时需要重新检查。
- 采集、音频和 WebRTC 传输由 Piik Core 负责，公网邀请可用性取决于上游隧道服务。
- 桌面壳未增加自动更新服务或遥测。

### 许可证与致谢

桌面端采用 [MIT 许可证](LICENSE)，版权声明为 Copyright (c) 2026 Piik community contributors。Piik 与内置原生助手源码使用上游作者的 MIT 许可证，见 [上游声明](LICENSE-UPSTREAM.md) 和 [Piik 许可证](licenses/piik-license.txt)。感谢 [TNTcraftHIM/Piik](https://github.com/TNTcraftHIM/Piik) 与贡献者。
