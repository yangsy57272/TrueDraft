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

## Set up AI without editing files

1. Open **Settings → AI connection settings** (设置 → AI 连接设置).
2. Choose **OpenAI API**, **Claude API**, **Local or LAN AI**, or **Other compatible service**. The first three prefill a typical address; replace it with the address your service provides when needed.
3. Paste your **API key**. For a local service that needs no key, check **This service needs no key**. A previously saved key is never shown; leave the field blank to keep it for the same provider/address. Enter the key again after changing providers or addresses.
4. Select **Load available models**, then pick a model from the Model field, or enter its exact name manually.
5. Select **Test connection**, then **Save AI settings**. The test sends only a short synthetic message, not your profile or essays. A cloud provider may charge for this small request. A successful test verifies the structured response format used by TrueDraft, not just that the address responds.

Saved settings take effect immediately and survive restarting. AI keys are encrypted in `ai-connection.enc` in the data directory, using the device encryption key in `settings.json`. Do not share either file. Choosing **AI off** clears the saved key and disables AI without deleting writing. Deleting the local account also clears the saved device key. Changing the connection asks for AI-processing consent again on the next analysis.

Existing `.env` settings still work until you save a connection in the UI. Saved UI settings take precedence, including AI off; no file editing or restart is needed. Hosted web deployments retain operator-managed AI settings; ordinary web users cannot replace the server’s provider or read its key.

For local AI, keep its service running and use a reachable address. OpenAI-compatible services must support Chat Completions with JSON-schema structured output; a model appearing in a model list alone does not establish compatibility.

## Build a package

Install the Node version in `.nvmrc` and run `npm ci --ignore-scripts`, then `npm run desktop:build` on the target operating system. The SQLite package supplies a native binary for each supported platform. Windows builds also require PowerShell 7 and NSIS. macOS builds use the bundled `codesign` and `ditto` tools. Outputs are under `dist/`. The Desktop packages GitHub workflow tests a clean install and verifies that a draft survives a restart before uploading the artifact.

Desktop startup applies schema migrations and refreshes the bundled public supplement catalog for existing profiles as well as new installations. Applicant drafts and profile records use the same data directory across upgrades.
