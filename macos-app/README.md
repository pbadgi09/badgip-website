# Badgip Admin (macOS)

Native SwiftUI companion app for managing the itspranavbadgi.com content in Firebase RTDB and committing images to the site's GitHub repo. Built as a Swift Package (no `.xcodeproj`) so it opens and runs directly in Xcode via `File > Open…` on this folder, or via `swift build`/`swift run` from the command line — deployment target is macOS 12 (Monterey) to match the current dev machine.

## One-time setup before building

1. **Firebase**: done — `Sources/BadgipAdmin/Resources/GoogleService-Info.plist` has the real config for the registered `com.badgip.admin` macOS app.
2. **Google Sign-In OAuth client**: done — native macOS apps (non-Catalyst) can't use the GoogleSignIn-iOS SDK, so this app authenticates via `AuthenticationServices` + a manual OAuth 2.0 + PKCE flow (see `Services/FirebaseAuthService.swift`). Firebase auto-provisioned a matching OAuth client when the app was registered with Google Sign-In enabled; its `CLIENT_ID`/`REVERSED_CLIENT_ID` (from the plist) are already set in `Services/Config.swift`.
3. **GitHub PAT**: create a fine-grained personal access token scoped to just the `badgip-website` repo, with `Contents: Read and write` and `Actions: Read and write`. Enter it once in the app's Deploy tab — it's stored in macOS Keychain, never in this repo.
4. **URL scheme registration (required for sign-in to work, not yet done)**: the OAuth callback only reaches the app if macOS knows to route its custom URL scheme to it. A plain `Package.swift` target can't declare this — after opening the project in Xcode, select the `BadgipAdmin` target → **Info** tab → **URL Types** → add one with scheme `com.googleusercontent.apps.466226587643-o1gmqikbvocdt2faps83via4hsldhmt6` (the `REVERSED_CLIENT_ID` from the plist). Without this step, `signInWithGoogle()` will open the browser but the callback will never return to the app.

## Building

- Open this folder in Xcode 14.2+ (`File > Open…` → select `macos-app/`), select the `BadgipAdmin` scheme, and Run.
- Or from the command line: `cd macos-app && swift build` (first resolve of `firebase-ios-sdk` takes a while — it's a large dependency graph).

## Distribution (.dmg)

Per project decision, this ships unsigned/ad-hoc (no paid Apple Developer account) since it's a single-user personal tool:

1. `swift build -c release`
2. Wrap the built executable into a minimal `.app` bundle (Info.plist + executable + the `GoogleService-Info.plist` resource bundle SPM produces alongside it).
3. `hdiutil create -volname "Badgip Admin" -srcfolder BadgipAdmin.app -ov -format UDZO BadgipAdmin.dmg`
4. On first launch on any Mac, right-click the app → Open (or run `xattr -cr BadgipAdmin.app`) to bypass the Gatekeeper "unidentified developer" warning — expected since the app isn't notarized.
