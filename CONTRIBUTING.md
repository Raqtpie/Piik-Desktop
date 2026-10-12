# Contributing / 贡献指南

## English

Use Node.js 22.14+ and run `npm ci`, `npm run check`, `npm run upstream:prepare`, then `npm run dev`. Build on the target OS/architecture. A Mac with Xcode command line tools is required for native helper changes.

Keep changes focused. Include the problem, resulting behavior and relevant validation in pull requests. Preserve the upstream MIT notices. Add behavioral tests for permissions, navigation, adapter compatibility and lifecycle changes. Confirm native source IDs and release checksums before upgrading Piik.

Never commit user configuration, invitation credentials, private sites, logs, binaries or signing keys. Review diagnostics before attaching them to issues. Report security problems privately to the maintainer through GitHub's available private reporting channels; do not publish live credentials in an issue.

## 简体中文

使用 Node.js 22.14+，依次运行 `npm ci`、`npm run check`、`npm run upstream:prepare`、`npm run dev`。在目标系统与架构构建；原生 Mac 助手修改需要安装 Xcode 命令行工具的 Mac。

请保持修改范围清晰，在 PR 中说明问题、修改后的行为和验证结果，并保留上游 MIT 声明。权限、导航、界面适配和生命周期修改应包含行为测试；升级 Piik 前请检查原生来源标识与发行包校验值。

不要提交个人配置、邀请凭据、私人站点、日志、二进制或签名密钥。附带诊断前请先检查内容。安全问题请通过 GitHub 可用的私密报告渠道联系维护者，不要在公开 Issue 发布有效凭据。
