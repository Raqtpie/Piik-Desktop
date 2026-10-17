# Piik Desktop

[English](README.md) · [简体中文](README.zh-CN.md)


## 项目简介

Piik Desktop 是适用于 Windows 和 macOS 的 [Piik](https://github.com/TNTcraftHIM/Piik) 社区桌面客户端。它将 Piik 官方房间页面与原生分享能力集成到 Electron 应用中，提供 **本地房间、公网邀请、连接站点** 三种入口，无需打开外部浏览器。

本项目为独立社区项目，并非 Piik 官方发行版。Piik 由 TNTcraft 与贡献者开发。桌面端 **0.2.0** 将内置 Piik App / Browser UI 固定为 **v2.1.0**（信令 `piik-v24`），与 2.0.x 协议兼容，仍与 1.x 不兼容；见 [Vendor Frontend](docs/VENDOR-FRONTEND.md)。

## 功能

- 中英文、明暗主题、最近站点记录和独立桌面启动页。
- 程序／窗口、屏幕、摄像头来源选择；桌面模式移除浏览器分享。
- 在 Piik 原有选择卡中显示原生来源预览。
- 无邀请链接时显示「创建链接」，已有链接时显示「更新链接」。
- 链接与房间号复制、完整的连接加载界面、自定义确认弹窗。
- 多网卡选择、托盘行为与本地诊断日志。
- 远程内容启用沙箱、上下文隔离和按当前站点限定的权限。

## 下载与平台状态

可在 [GitHub Releases](https://github.com/Raqtpie/Piik-Desktop/releases) 下载。Windows 构建生成 NSIS `.exe` 安装包，macOS 目标生成 `.dmg` 与 `.zip`。

当前已在 Windows 验证。macOS x64 与 arm64 安装包已完成 CI 编译，但捕获权限、摄像头和音频仍需在实体 Mac 上验证。完整范围见 [验证记录](docs/VALIDATION.md)。

## 源码构建

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

准备脚本使用固定 SHA-256 校验 Piik 官方发行包，并校验仓库内 `vendor/frontend` 与 Core 钉版本一致（一版对一版）。Windows 保留官方捕获助手；macOS 仍用 Desktop 的 MIT 助手源码补上上游仍缺失的 `--preview` 命令（本次升级未改写 `native/darwin`）。见 [原生源码来源说明](native/darwin/PROVENANCE.md) 与 [Vendor Frontend](docs/VENDOR-FRONTEND.md)。

## 使用方法

1. 选择本地房间、公网邀请或连接站点。站点需要填写 HTTPS 根地址；HTTP 仅接受 localhost。
2. 进入 Piik，选择原生分享来源；首次设备访问可能需要系统授权。
3. 无邀请链接时点击「创建链接」。创建与更新继续使用 Piik 原有操作，桌面端不会自动创建邀请凭据。
4. 「首页」会停止 Core、房间连接与分享；「刷新」重新加载当前页面；「日志」打开本地诊断目录。

新安装不会预填站点，最多保留五条最近站点。站点地址变化默认需要确认，用户可在启动页开启受信任 HTTPS 站点的自动跳转。对外提供诊断文件前，请先检查内容。

## 开发与贡献

| 命令 | 用途 |
| --- | --- |
| `npm start` | 启动应用 |
| `npm run dev` | 启动应用并开启开发工具 |
| `npm run check` | 执行测试和 JavaScript 语法检查 |
| `npm run upstream:prepare` | 校验 vendor/frontend 后下载并校验 Piik App，按需构建 Mac 助手 |
| `npm run frontend:sync` | 按当前 Core 钉刷新仓库内 Browser UI vendor |
| `npm run frontend:verify` | 校验 vendor/frontend 与 Core 钉、文件校验和 |
| `npm run pack` | 生成未打包安装器的测试应用目录 |
| `npm run dist` | 生成安装包或压缩包 |

```text
src/                   Electron 生命周期、启动页、弹窗与界面适配
native/darwin/         固定版本的 macOS 捕获助手与预览修复
scripts/               上游 Core 准备与 frontend vendor 同步
vendor/frontend/       与 Core 同版本的 Browser UI（入库）
tests/                 权限、导航、界面与进程生命周期测试
.github/workflows/     Windows 和 macOS 构建任务
assets/                应用图标
licenses/              上游许可证声明
```

依赖、上游二进制、构建缓存、安装包和个人配置均由 `.gitignore` 排除。欢迎通过 [Issues](https://github.com/Raqtpie/Piik-Desktop/issues) 提交问题，请提供系统、应用版本、连接模式和已去除敏感信息的诊断。贡献说明见 [贡献指南](CONTRIBUTING.zh-CN.md)。

## 上游版本钉与升级路径

- **当前钉**：Piik **v2.1.0** Core + 同版本 `vendor/frontend`。
- **从 Desktop 0.1.0 / Piik 1.x Site 升级**：必须整体升到 2.x。2.0.0 起信令与画质设置不兼容 1.x；混用会导致无法进房。
- **2.0.x → 2.1.0**：协议/DB 兼容（仍为 `piik-v24`）；Desktop 0.2.0 内置 Piik 2.1.0。
- 刷新 vendor：见 [docs/VENDOR-FRONTEND.md](docs/VENDOR-FRONTEND.md)。

## 已知限制

- 安装包未签名，项目未包含签名证书或 macOS 公证。
- macOS 实机验证尚未完成，JavaScript 测试无法证明原生设备链路正常。
- 界面适配最初针对 Piik v1.9.2；升级到 **v2.1.0** 后需在实机重新检查卡片/邀请等 DOM 适配。
- **Piik 2.0 与 1.x 不兼容**（`piik-v23`→`piik-v24`）。连接站点时请使用 2.x Site；App 与 Site 须同代升级。
- 采集、音频和 WebRTC 传输由 Piik Core 负责，公网邀请可用性取决于上游隧道服务。
- 桌面壳未增加自动更新服务或遥测。

## 许可证与致谢

桌面端采用 [MIT 许可证](LICENSE)，版权声明为 Copyright (c) 2026 Piik community contributors。Piik 与内置原生助手源码使用上游作者的 MIT 许可证，见 [上游声明](LICENSE-UPSTREAM.md) 和 [Piik 许可证](licenses/piik-license.txt)。感谢 [TNTcraftHIM/Piik](https://github.com/TNTcraftHIM/Piik) 与贡献者。
