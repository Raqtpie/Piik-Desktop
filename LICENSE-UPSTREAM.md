# Upstream third-party notices

Piik Desktop is an independent community wrapper; not an official Piik release.

The bundled core is built and distributed by the upstream project:
https://github.com/TNTcraftHIM/Piik

Piik-owned code is released under the MIT license; see the official upstream
LICENSE and licenses/ directory for full third-party notices. Distributors of
this wrapper **must include the upstream LICENSE and licenses files** from the
verified release asset, and review them before distributing binaries.

Windows uses the upstream binaries unchanged. On macOS, the build script replaces
only the native capture helper with Desktop’s MIT source plus the missing
source-preview command. The v2.1.0 pin retains the helper's v1.9.2 source baseline;
see native/darwin/PROVENANCE.md for provenance and validation limits.

The Browser UI matching the Core pin is also vendored under `vendor/frontend/`
(see docs/VENDOR-FRONTEND.md). Core archive version and SHA-256 hashes are pinned
in `scripts/prepare-upstream.cjs` and written into the bundled manifest.
