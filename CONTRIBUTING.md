# Contributing

[English](CONTRIBUTING.md) · [简体中文](CONTRIBUTING.zh-CN.md)

Use Node.js 22.14+ and run `npm ci`, `npm run check`, `npm run upstream:prepare`, then `npm run dev`. Build on the target OS/architecture. A Mac with Xcode command line tools is required for native helper changes.

Keep changes focused. Include the problem, resulting behavior and relevant validation in pull requests. Preserve the upstream MIT notices. Add behavioral tests for permissions, navigation, adapter compatibility and lifecycle changes. Confirm native source IDs and release checksums before upgrading Piik.

Never commit user configuration, invitation credentials, private sites, logs, binaries or signing keys. Review diagnostics before attaching them to issues. Report security problems privately to the maintainer through GitHub's available private reporting channels; do not publish live credentials in an issue.

Submit changes through a pull request targeting `main`. Code changes are built on Windows and macOS during PR checks; Markdown-only changes skip these builds. Merging into `main` does not rebuild the app. To publish a release, update the version in `package.json` and the lockfile, prepare both release-notes files, and push a matching `v<version>` tag after merging. Manual workflow runs build packages without publishing a release.
