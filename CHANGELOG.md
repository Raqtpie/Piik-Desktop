# Changelog

## 0.2.0

### Breaking changes

- Upgrade the bundled Piik App from v1.9.2 to v2.1.0. Piik 1.x sites and sessions are no longer supported. Upgrade connected Apps and Sites to compatible 2.x versions, stop existing shares and send fresh invitations.
- Desktop versions are independent of Piik versions. This initial-development compatibility break advances Desktop from 0.1.0 to 0.2.0.

### Build and maintenance

- Pin official Piik v2.1.0 archives with platform-specific SHA-256 checksums.
- Commit matching Browser UI under `vendor/frontend/` with `MANIFEST.json` (signaling **piik-v24**, revision `9925486`).
- `upstream:prepare` refuses to proceed unless the frontend lock matches the Core pin.
- Add `npm run frontend:sync` / `frontend:verify` and `docs/VENDOR-FRONTEND.md` (中英说明).
- Document compatibility: **2.1.0 is protocol/DB compatible with 2.0.x**; still **incompatible with 1.x**. App+Site must upgrade together from 1.x.
- Keep the macOS helper source baseline unchanged; compatibility with the new Core needs device validation.
- Split English and Chinese documentation. Main-branch pushes no longer trigger builds; release tags build and publish, while eligible pull requests and manual dispatches can still build.

### Validation

- 40 automated tests, frontend checksum verification and JavaScript syntax checks pass locally.
- New-version Windows/macOS package builds and native capture, audio, authorization and 2.x Site integration still require validation.

## 0.1.0

First public release of Piik Desktop.

- Native launcher with Local Room, Public Invite and Connect to Site modes.
- English/Chinese, themes, recent sites, loading UI, origin confirmation and tray behavior.
- Desktop-only source choices and original-card native previews.
- State-aware Create link / Rotate link labels and scoped clipboard writes.
- Pinned Piik App v1.9.2 assets, SHA-256 verification and macOS native preview helper source.
- Windows/macOS build definitions, tests and bilingual documentation.

Windows runtime behavior has been tested. macOS native compilation/device validation is pending.
