# Badgip Admin (macOS)

Native SwiftUI companion app for managing the itspranavbadgi.com content in Firebase RTDB and committing images to the site's GitHub repo. Built as a Swift Package (no `.xcodeproj`) so it opens and runs directly in Xcode via `File > Open…` on this folder, or via `swift build`/`swift run` from the command line — deployment target is macOS 12 (Monterey) to match the current dev machine.

## One-time setup before building

1. **Firebase**: done — `Sources/BadgipAdmin/Resources/GoogleService-Info.plist` has the real config for the registered `com.badgip.admin` macOS app.
2. **Google Sign-In OAuth client**: done — native macOS apps (non-Catalyst) can't use the GoogleSignIn-iOS SDK, so this app authenticates via `AuthenticationServices` + a manual OAuth 2.0 + PKCE flow (see `Services/FirebaseAuthService.swift`). Firebase auto-provisioned a matching OAuth client when the app was registered with Google Sign-In enabled; its `CLIENT_ID`/`REVERSED_CLIENT_ID` (from the plist) are already set in `Services/Config.swift`.
3. **GitHub PAT**: create a fine-grained personal access token scoped to just the `badgip-website` repo, with `Contents: Read and write` and `Actions: Read and write`. Enter it once in the app's Deploy tab — it's stored in macOS Keychain, never in this repo.
4. **URL scheme registration**: done by `scripts/build-app.sh` (see below) — no Xcode GUI step needed. The OAuth callback only reaches the app if macOS's Launch Services knows to route its custom URL scheme (`com.googleusercontent.apps.466226587643-o1gmqikbvocdt2faps83via4hsldhmt6`, the plist's `REVERSED_CLIENT_ID`) to it; the script embeds `Info.plist`'s `CFBundleURLTypes` into a real `.app` bundle and registers it directly with `lsregister -f`.

## Building and running

**Recommended — via the build script** (works entirely from the terminal, no Xcode GUI required):

```
./scripts/build-app.sh debug   # or: release
open build/BadgipAdmin.app
```

This does everything `swift build` does, then assembles a proper `.app` bundle (executable + `Info.plist` + the SPM resource bundle holding `GoogleService-Info.plist`), ad-hoc signs it, and registers it with Launch Services so the OAuth URL-scheme callback actually routes back to the app. Re-run it after any code change before relaunching.

**Alternative — via Xcode**: open this folder (`File > Open…` → select `macos-app/`), select the `BadgipAdmin` scheme, and Run. Xcode wraps SPM executable targets into its own temporary app bundle for the debugger, which may or may not carry over the `CFBundleURLTypes` declared in `Sources/BadgipAdmin/Info.plist` (untested) — if Google sign-in doesn't return to the app when run this way, add a URL Type (`com.googleusercontent.apps.466226587643-o1gmqikbvocdt2faps83via4hsldhmt6`) via the target's **Info** tab, or just use the build script instead.

## Distribution (.dmg)

Per project decision, this ships unsigned/ad-hoc (no paid Apple Developer account) since it's a single-user personal tool:

1. `./scripts/build-app.sh release`
2. `hdiutil create -volname "Badgip Admin" -srcfolder build/BadgipAdmin.app -ov -format UDZO build/BadgipAdmin.dmg`
3. On first launch on any Mac, right-click the app → Open (or run `xattr -cr BadgipAdmin.app`) to bypass the Gatekeeper "unidentified developer" warning — expected since the app isn't notarized.
