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
            .frame(minWidth: 900, minHeight: 600)
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
