# 贡献指南

[English](CONTRIBUTING.md) · [简体中文](CONTRIBUTING.zh-CN.md)


使用 Node.js 22.14+，依次运行 `npm ci`、`npm run check`、`npm run upstream:prepare`、`npm run dev`。在目标系统与架构构建；原生 Mac 助手修改需要安装 Xcode 命令行工具的 Mac。

请保持修改范围清晰，在 PR 中说明问题、修改后的行为和验证结果，并保留上游 MIT 声明。权限、导航、界面适配和生命周期修改应包含行为测试；升级 Piik 前请检查原生来源标识与发行包校验值。

不要提交个人配置、邀请凭据、私人站点、日志、二进制或签名密钥。附带诊断前请先检查内容。安全问题请通过 GitHub 可用的私密报告渠道联系维护者，不要在公开 Issue 发布有效凭据。

请通过以 `main` 为目标的 PR 提交修改。代码变更会在 PR 检查中构建 Windows 和 macOS 安装包；仅修改 Markdown 文档时跳过构建。合并到 `main` 后不会重复构建。发布时先更新 `package.json` 和锁文件中的版本号、准备两种语言的发布说明，再在合并后推送匹配的 `v<版本号>` 标签。手动运行工作流只构建安装包，不发布 Release。
