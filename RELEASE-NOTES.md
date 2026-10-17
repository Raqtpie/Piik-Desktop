# Piik Desktop v0.2.0

Upgrade to Piik 2.x with a pinned Core and matching frontend.

## Breaking compatibility

This release upgrades the bundled Piik App from v1.9.2 to v2.1.0. Piik 1.x sites and sessions cannot be used with this version. Desktop 0.1.0 used Piik 1.x; Desktop 0.2.0 requires compatible Piik 2.x sites.

Stop active shares, upgrade connected Apps and your self-hosted Site together, refresh Host and Viewer pages, then send fresh invitation links. Piik 2.1.0 preserves the 2.x communication protocols and database format.

## Changes

- Pin Piik v2.1.0 official archives with platform-specific SHA-256 verification.
- Vendor the matching Browser UI and verify its release and file checksums before preparing the Core. Runtime room pages remain served by the bundled Core or connected Site.
- Add frontend synchronization and verification commands with maintainer documentation.
- Separate English and Chinese documentation. Main-branch pushes no longer rebuild packages; release tags build and publish the release.

## Downloads

- Windows x64: NSIS installer.
- macOS Intel x64: DMG and application ZIP.
- macOS Apple Silicon arm64: DMG and application ZIP.
- Source archive and SHA-256 checksums.

## Validation and limitations

40 automated tests, frontend checksum verification and JavaScript syntax checks pass locally. Package compilation for this version is verified by the release workflow; local checks do not establish native runtime compatibility.

The macOS capture helper retains its v1.9.2 source baseline with Desktop's preview patch. Native preview, sharing, audio, permissions and 2.x Site integration still need device testing. Frontend synchronization currently requires a Linux x64 environment; ordinary builds use the committed frontend assets.

These are unsigned community builds, powered by Piik v2.1.0 from TNTcraft and contributors.
