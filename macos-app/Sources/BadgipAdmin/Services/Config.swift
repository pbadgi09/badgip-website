import Foundation

// Google Sign-In on native (non-Catalyst) macOS can't use the GoogleSignIn-iOS
// SDK (it's UIKit-only), so auth uses AuthenticationServices + a manual OAuth
// 2.0 + PKCE flow against Google's endpoints, then hands the resulting ID
// token to Firebase's GoogleAuthProvider. CLIENT_ID/REVERSED_CLIENT_ID below
// come straight from GoogleService-Info.plist — Firebase auto-provisions a
// matching OAuth client when the Apple app is registered with Google Sign-In
// enabled, so no separate Google Cloud Console setup is needed.
enum GoogleOAuthConfig {
    static let clientID = "466226587643-o1gmqikbvocdt2faps83via4hsldhmt6.apps.googleusercontent.com"
    static let redirectScheme = "com.googleusercontent.apps.466226587643-o1gmqikbvocdt2faps83via4hsldhmt6"
    static var redirectURI: String { "\(redirectScheme):/oauth2redirect" }
}
