import SwiftUI

struct SignInView: View {
    @EnvironmentObject private var authService: FirebaseAuthService

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 28) {
                ZStack {
                    Circle()
                        .fill(Color.badgipAccent.opacity(0.12))
                        .frame(width: 88, height: 88)
                    Image(systemName: "square.and.pencil")
                        .font(.system(size: 34, weight: .medium))
                        .foregroundStyle(.badgipAccent)
                }

                VStack(spacing: 8) {
                    Text("Badgip Admin")
                        .font(.largeTitle.weight(.bold))

                    Text("Sign in with the Google account authorized for the itspranavbadgi Firebase project.")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 340)
                }

                Button {
                    authService.signInWithGoogle()
                } label: {
                    HStack(spacing: 8) {
                        if authService.isSigningIn {
                            ProgressView().controlSize(.small).tint(.black)
                        } else {
                            Image(systemName: "arrow.right.circle.fill")
                        }
                        Text(authService.isSigningIn ? "Signing in…" : "Sign in with Google")
                    }
                }
                .buttonStyle(.badgipPrimary)
                .disabled(authService.isSigningIn)

                if let errorMessage = authService.errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 340)
                }
            }
            .padding(48)
        }
        .frame(minWidth: 480, minHeight: 420)
    }
}
