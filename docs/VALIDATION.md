# Release validation: 0.1.0

## Review scope

Launcher, footer attribution, invitation labels, permissions, remote navigation,
loading transitions, subprocess lifecycle, upstream preparation, native preview
source, packaging and repository hygiene were reviewed before the first release.

## Findings fixed

- An absent invitation was labeled Rotate link. The desktop adapter now labels
  the existing action Create link until an invitation exists, including after
  revocation and in both languages. It never generates credentials automatically.
- Browser-source removal left a grid slot/popover and could trigger camera access
  during discovery. The complete tab wrapper/popover is hidden, three-column layout
  is maintained through React updates, and camera activation is not automatic.
- Clipboard writes were denied by the default permission policy. Both handlers
  now allow sanitized writes only from the active Piik origin/WebContents; reads
  and other origins remain denied.
- Remote content was attached before the launcher switched to its toolbar. It now
  loads offscreen behind a complete loading panel and is attached after success.
- Multiple LAN addresses caused a generic startup failure. The app now offers the
  reported addresses and retries with the user's choice.
- A failed asynchronous stdin shutdown write could raise an unhandled EPIPE. The
  subprocess stream now handles that error; startup/shutdown tests run on Windows
  as well as Unix instead of being skipped.
- Stored window bounds and tray preferences are validated. Multi-address dialogs
  expand to fit additional action rows.
- Build dependencies had known advisories. Electron is pinned to 44.7.0 and
  electron-builder to 26.15.3. The unsafe extractor was replaced with Electron's
  maintained @electron-internal/extract-zip 1.0.5. The build-only global-agent
  override removes the vulnerable legacy logging dependency chain.
- CI uses the lockfile with npm ci and invokes the builder directly to avoid npm
  interpreting builder architecture flags. Electron binary installation is explicit
  through the project's postinstall script.

## Automated checks

- 39 Node behavior/tests pass on Windows, including all three process lifecycle
  modes; no skipped tests.
- All runtime and preparation JavaScript passes syntax checks.
- Full dependency audit against registry.npmjs.org reports zero advisories for the
  final lockfile at review time. Audit results can change as advisories are published.
- Old dependency mirrors, generated artifacts, user configuration, build caches
  and the upstream reference checkout are excluded from version control.

## Native and release limits

Windows launcher, source-card layout, native window/display previews and multi-LAN
startup were exercised during development. The native helper produced a bounded
320x180 24-bit BMP through the existing source-preview command.

The macOS preview fix is source-reviewed but has not been compiled or tested on a
Mac. It must be verified in macOS CI and on physical Intel/Apple Silicon machines;
JavaScript tests cannot establish camera/audio/capture behavior on those machines.
Windows installers are unsigned. No remote GitHub release or CI run is claimed by
this local preparation. Device access and end-to-end viewer/audio behavior require
additional physical testing.
