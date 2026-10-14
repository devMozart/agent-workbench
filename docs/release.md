# CI and releases

## What CI runs

Every push and pull request runs on Linux: the frontend checks with the unit
and browser tiers, the core's format, lint and tests, and the real app
through the driver tier, with a screenshot of the window kept as an
artifact. The core's tests on Windows and macOS and the driver tier on
Windows run before every release, where a failure on any of them stops the
build, or on request from the Actions tab; those runners cost two and ten
Linux minutes a minute, so a push does not run them.
[Testing](testing.md) says what each tier covers.

## Cutting a release

Releases are GitHub Releases with the bundles attached: `.dmg` for both Mac
architectures, `.AppImage`, `.deb` and `.rpm` for Linux, `.msi` and an NSIS
installer for Windows. Every bundle carries the remote daemon for each
machine kind it can put one on.

1. Set the version in `tauri.conf.json` and `package.json`, commit.
2. Tag it: `git tag v0.2.0 && git push origin v0.2.0`.
3. The release workflow builds the daemons, then the bundles on all four
   targets, and opens a draft release for the tag with everything attached.
   It refuses a tag that does not match the version in the configuration.
   Attaching is a step of its own that retries and replaces what is already
   there, so a run that fell over while uploading can be run again from the
   Actions tab; the jobs that succeeded keep what they attached.
4. Read the draft, then publish it.
5. Put the release in the organisation's Homebrew tap. `scripts/cask.sh`
   with the version prints the cask for the app, and `scripts/formula.sh`
   the formula for the daemon, checksums included; they go in the tap as
   `Casks/agent-workbench.rb` and `Formula/agent-workbench-remote.rb`. Users
   then get the app with `brew tap elva-labs/elva` and
   `brew install --cask agent-workbench`, a remote machine gets the daemon
   with `brew install elva-labs/elva/agent-workbench-remote`, and both
   update with `brew upgrade`.

Running the workflow by hand from the Actions tab builds the same bundles
without touching releases; they are kept as workflow artifacts for a
fortnight.

## Signing

A release is signed or it is not made: a tag whose build finds no
certificate stops before any bundle is attached, since an unsigned build
costs every user. macOS asks them to right-click and open the app the
first time, and asks again for the daemon the app puts in the home
directory, every time a new version puts a new one there, since the copy
keeps the quarantine flag the app came with; Windows shows a SmartScreen
warning. A manual run of the workflow builds unsigned when the secrets are
missing, as workflow artifacts, for trying the workflow out.

- **macOS**: `MACOS_CERTIFICATE` (the Developer ID Application certificate
  as a base64 `.p12`) and `MACOS_CERTIFICATE_PASSWORD` sign the app and
  the daemons it carries, with `MACOS_SIGN_IDENTITY` naming the identity or,
  left empty, the one Developer ID Application identity in the certificate;
  `NOTARY_KEY` (an App Store Connect API key, as the PEM or base64 of it),
  `NOTARY_KEY_ID` and `NOTARY_ISSUER_ID` notarize it. These are the
  organisation's secrets, shared with its other apps: an organisation owner
  grants them to this repository under the organisation's Actions secrets,
  and a tag build fails at once when they stop reaching it. With the
  certificate alone the app is signed but not notarized. A manual run of
  the release workflow from the Actions tab builds signed bundles as
  workflow artifacts without touching releases, which is how a change to
  the secrets is tried out.
- **Windows**: a code-signing certificate through the Tauri bundle
  configuration or Azure Trusted Signing. Not wired yet.
