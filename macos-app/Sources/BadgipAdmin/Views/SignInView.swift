import SwiftUI

struct SignInView: View {
    @EnvironmentObject private var authService: FirebaseAuthService

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "square.and.pencil")
                .font(.system(size: 44))
                .foregroundStyle(.badgipAccent)

            Text("Badgip Admin")
                .font(.title2.bold())

            Text("Sign in with the Google account authorized for the itspranavbadgi Firebase project.")
                .font(.callout)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 320)

            Button {
                authService.signInWithGoogle()
            } label: {
                if authService.isSigningIn {
                    ProgressView().controlSize(.small)
                } else {
                    Text("Sign in with Google")
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(authService.isSigningIn)

            if let errorMessage = authService.errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 320)
            }
        }
        .padding(48)
        .frame(minWidth: 420, minHeight: 360)
    }
}
