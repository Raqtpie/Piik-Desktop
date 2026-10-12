Based on Piik v1.9.2, commit 390e637d4e9090e6258ccc3d3a0a3f877d81b25c:
https://github.com/TNTcraftHIM/Piik/tree/390e637d4e9090e6258ccc3d3a0a3f877d81b25c/native/capture/darwin

MIT license: ../../licenses/piik-license.txt.

Desktop adds only the missing --preview command. Source identity validation,
capture, encoding, audio and sharing continue using the upstream implementation.
The command returns a bounded BMP through the existing Go source-preview protocol.
Build requires Xcode command line tools on macOS 13+. No separate preview UI or
Electron screen capture replacement is used. Windows keeps the official helper.
