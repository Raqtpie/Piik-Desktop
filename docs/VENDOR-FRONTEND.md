# Vendored Piik frontend（一版对一版）

Piik Desktop 锁定 **同一版 Piik Core + 同一版 Browser UI**，不随任意上游浮动。

| 锁定项 | 路径 / 来源 |
| --- | --- |
| Core（平台二进制） | `npm run upstream:prepare` → `vendor/piik/`（gitignore，按平台下载） |
| Frontend（Browser UI） | 仓库内 `vendor/frontend/`（与 Core 同 tag 的构建产物） |
| 版本钉 | `scripts/prepare-upstream.cjs` 的 `RELEASE`，须等于 `vendor/frontend/MANIFEST.json` 的 `piikRelease` |

当前钉： **Piik v2.1.0**（revision `9925486c…`），信令协议 **`piik-v24`**。

## 为何必须同版本

- Piik **2.0.0** 为破坏性升级：`SignalingProtocol` `piik-v23` → `piik-v24`，画质设置结构变更。
- **App 与 Site 必须一起升级**；**1.x 无法加入 2.0 会话**。
- **v2.1.0** 仍属 2.x（`piik-v24` / 2.x DB lineage），与 2.0.x Site/App 协议兼容，但仍与 1.x 不兼容。

Desktop 的「连接站点」模式依赖远端 Site 的前端与信令；请只连接 **2.x** 站点。本地房间 / 公网邀请使用本包锁定的 Core（内嵌同版 UI）。

## 日常构建

```bash
npm ci
npm run check          # 语法与行为测试；含 frontend 锁校验
npm run upstream:prepare   # 校验 vendor/frontend 后下载对应平台 Core
npm start
```

`upstream:prepare` 会：

1. 读取并校验 `vendor/frontend/MANIFEST.json`（版本与文件 SHA-256）。
2. 下载并校验当前 `RELEASE` 的官方 `piik-app-*.zip` 到 `vendor/piik/`。
3. 在 macOS 上仍用 `native/darwin` 的 `--preview` 补丁替换官方 helper（上游仍缺该命令；**本次未改写 native/darwin 源码**）。

## 刷新 vendor（升级上游时）

1. 在 `scripts/prepare-upstream.cjs` 把 `RELEASE` / `RELEASES` 改为目标 tag 与官方 SHA-256（见 [Piik Releases](https://github.com/TNTcraftHIM/Piik/releases) 校验段）。
2. 在 `scripts/sync-frontend-vendor.cjs` 的 `FRONTEND_RUNTIME` 增加该 tag 的 runtime 包名、SHA-256、revision、signaling 标识。
3. 运行：

```bash
npm run frontend:sync
npm run check
# 在目标平台再执行：
npm run upstream:prepare
```

4. 更新 README / CHANGELOG 中的钉版本与 1.x 不兼容说明，提交 `vendor/frontend/**` 与脚本变更。

`frontend:sync` 当前需要 **Linux x64** 环境（脚本会执行 Linux 二进制），Windows/macOS 维护者请在 Linux x64 环境中刷新并提交资源。普通构建不需要运行同步命令。

`frontend:sync` 会下载官方 **Linux x64 runtime**（`piik-*-runtime.tar.gz`），短暂启动其中的 `piik-server`，抓取与 App 内嵌相同的 Vite 静态资源写入 `vendor/frontend/`，并重写 `MANIFEST.json`。

## 打包说明

`electron-builder` 的 `extraResources` 仍只附带 `vendor/piik`（平台 Core）。`vendor/frontend` 进入应用 `files`，供壳层校验、文档与后续 UI 适配对照；运行时房间页仍由锁定 Core / 远端 2.x Site 提供。二者通过 MANIFEST 与 `RELEASE` 保持一版对一版。

## 相关文件

- `vendor/frontend/MANIFEST.json` — 锁版本、协议、文件校验
- `scripts/prepare-upstream.cjs` — Core 钉 + 准备时校验 frontend
- `scripts/sync-frontend-vendor.cjs` — 刷新 frontend vendor
- `native/darwin/PROVENANCE.md` — macOS preview helper 来源（仍为 Desktop 补丁，未在本升级中重写）
