# TrueDraft desktop app

- **Windows x64:** run `TrueDraft-Windows-x64.exe`. It installs for the current Windows user and opens TrueDraft. Later, use the desktop or Start menu shortcut.
- **Linux x64 / arm64:** extract the matching `.tar.gz` and run `./TrueDraft`. Node.js is bundled. Run `sh install.sh` once to add TrueDraft to the applications menu, and keep the extracted folder in place. A desktop with `xdg-open` is needed to open the browser automatically. Linux packages target glibc distributions such as Ubuntu 24.04. Stop with `./TrueDraft --stop`.
- **macOS:** unzip the package for Apple Silicon (`arm64`) or Intel (`x64`), then open `TrueDraft.app`. The downloadable bundle is ad-hoc signed and has no Apple notarization. The Windows installer has no publisher signature.

TrueDraft opens in your default browser and signs you into a profile on this device. The local server listens on `127.0.0.1`. Essays and planning work can be saved offline. Optional AI feedback requires a provider account, a connection to that provider, and consent in the app.

| System | Data directory |
| --- | --- |
| Windows | `%LOCALAPPDATA%\TrueDraft` |
| Linux | `$XDG_DATA_HOME/TrueDraft` or `~/.local/share/TrueDraft` |
| macOS | `~/Library/Application Support/TrueDraft` |

To back up a profile, stop TrueDraft and copy the data directory. Keep `truedraft.sqlite` and `settings.json` together. The latter contains the key needed to decrypt stored drafts. Stop from the Windows Start menu using **Stop TrueDraft**. On macOS, run `"/path/to/TrueDraft.app/Contents/MacOS/TrueDraft" --stop` in Terminal. Reinstalling uses the same data directory.

To enable AI feedback, stop the app and create `.env` in its data directory. Set `AI_PROVIDER` and the provider settings from `.env.example`, then reopen the app. Keep the provider key in that local file.

## Build a package

Install the Node version in `.nvmrc` and run `npm ci --ignore-scripts`, then `npm run desktop:build` on the target operating system. The SQLite package supplies a native binary for each supported platform. Windows builds also require PowerShell 7 and NSIS. macOS builds use the bundled `codesign` and `ditto` tools. Outputs are under `dist/`. The Desktop packages GitHub workflow tests a clean install and verifies that a draft survives a restart before uploading the artifact.

Desktop startup applies schema migrations and refreshes the bundled public supplement catalog for existing profiles as well as new installations. Applicant drafts and profile records use the same data directory across upgrades.
