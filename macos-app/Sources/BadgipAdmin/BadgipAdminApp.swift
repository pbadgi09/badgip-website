import FirebaseCore
import SwiftUI

@main
struct BadgipAdminApp: App {
    @StateObject private var authService = FirebaseAuthService()
    @StateObject private var rtdbService = RTDBService()

    init() {
        Self.configureFirebase()
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if authService.currentUser != nil {
                    DashboardView()
                } else {
                    SignInView()
                }
            }
            .environmentObject(authService)
            .environmentObject(rtdbService)
            .frame(minWidth: 960, minHeight: 640)
            .tint(.badgipAccent)
            // .tint() alone doesn't reach AppKit-bridged controls like the
            // sidebar List's selection highlight (stays system blue without
            // this) — .accentColor() is the older but still-necessary path
            // for that specific case.
            .accentColor(.badgipAccent)
            .preferredColorScheme(.dark)
        }
        .windowStyle(.titleBar)
    }

    // SPM executable targets keep bundled resources in `Bundle.module`, not
    // `Bundle.main` — FirebaseApp.configure()'s default lookup only checks
    // `Bundle.main`, so the plist is loaded explicitly here instead.
    private static func configureFirebase() {
        guard let path = Bundle.module.path(forResource: "GoogleService-Info", ofType: "plist"),
              let options = FirebaseOptions(contentsOfFile: path)
        else {
            print("⚠️ GoogleService-Info.plist not found or invalid — replace the placeholder in Resources/. See docs/SETUP.md.")
            return
        }
        FirebaseApp.configure(options: options)
    }
}
