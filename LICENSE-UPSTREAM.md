# Upstream third-party notices

Piik Desktop is an independent community wrapper; not an official Piik release.

The bundled core is built and distributed by the upstream project:
https://github.com/TNTcraftHIM/Piik

Piik-owned code is released under the MIT license; see the official upstream
LICENSE and licenses/ directory for full third-party notices. Distributors of
this wrapper **must include the upstream LICENSE and licenses files** from the
verified release asset, and review them before distributing binaries.

Windows uses the upstream binaries unchanged. On macOS, the build script replaces
only the native capture helper with the pinned MIT source plus the missing
source-preview command. See native/darwin/PROVENANCE.md. Go/React remain unchanged.
The upstream archive version and SHA-256 hash are pinned in
`scripts/prepare-upstream.cjs` and written into the bundled manifest.
