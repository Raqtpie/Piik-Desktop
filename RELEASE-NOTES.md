# Piik Desktop v0.1.0

First public release / 首个公开版本。

## Downloads / 下载

- Windows x64: NSIS installer / Windows 安装器。
- macOS Intel x64: DMG and application ZIP / Intel 版安装镜像与应用压缩包。
- macOS Apple Silicon arm64: DMG and application ZIP / Apple Silicon 版安装镜像与应用压缩包。
- Source archive and SHA-256 checksums / 源码与 SHA-256 校验值。

## Highlights / 功能

- Local Room, Public Invite and Connect to Site / 本地房间、公网邀请、连接站点。
- English/Chinese, light/dark themes and recent sites / 中英文、明暗主题与最近站点。
- Native window/screen/camera source selection and source-card previews / 原生来源选择与卡片预览。
- Create link / Rotate link labels reflect invitation state / 邀请按钮按状态显示创建或更新。
- Fixed clipboard copying, connection loading and desktop-only source tabs / 修复复制、连接加载与桌面来源入口。

## Validation / 验证范围

39 tests pass. macOS x64 and arm64 compile successfully in CI; package architectures have been checked to match their Core and capture helper. Physical macOS camera/audio/permission behavior still needs device testing.

39 项测试通过。macOS 两种架构完成 CI 编译，包内主程序、Core 与捕获助手架构已核对匹配。Mac 摄像头、音频与系统权限仍需实机验证。

These are unsigned community builds. Piik Desktop is maintained by Raqtpie & Piik community, powered by Piik v1.9.2 from TNTcraft and contributors.

未签名社区构建。桌面端由 Raqtpie & Piik community 维护，基于 TNTcraft 与贡献者开发的 Piik v1.9.2。
