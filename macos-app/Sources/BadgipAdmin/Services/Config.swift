import Foundation

// Google Sign-In on native (non-Catalyst) macOS can't use the GoogleSignIn-iOS
// SDK (it's UIKit-only), so auth uses AuthenticationServices + a manual OAuth
// 2.0 + PKCE flow against Google's endpoints, then hands the resulting ID
// token to Firebase's GoogleAuthProvider. This needs an OAuth Client ID
// (type "iOS", any bundle ID works since PKCE avoids a client secret) created
// in Google Cloud Console for the itspranavbadgi Firebase project.
// See docs/SETUP.md.
enum GoogleOAuthConfig {
    static let clientID = "REPLACE_WITH_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com"
    static let redirectScheme = "com.badgip.admin"
    static var redirectURI: String { "\(redirectScheme):/oauth2redirect" }
}
