import SwiftUI

/// Turns raw errors into friendly, actionable messages. GitHub HTTP errors
/// are already mapped in GitHubServiceError.friendly; this additionally
/// catches offline/URL errors that surface straight from URLSession.
enum FriendlyError {
    static func describe(_ error: Error) -> String {
        if let urlError = error as? URLError {
            switch urlError.code {
            case .notConnectedToInternet, .networkConnectionLost, .cannotConnectToHost, .cannotFindHost, .timedOut, .dataNotAllowed:
                return "No internet connection. Check your network and try again."
            default:
                break
            }
        }
        return error.localizedDescription
    }
}

/// Inline error with an optional Retry — used in list/editor load paths in
/// place of a bare red Text.
struct ErrorBanner: View {
    let message: String
    var retry: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.orange)
            Text(message)
                .font(.caption)
                .fixedSize(horizontal: false, vertical: true)
            Spacer()
            if let retry {
                Button("Retry", action: retry)
                    .buttonStyle(.badgipSecondary)
                    .controlSize(.small)
            }
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 10).fill(Color.orange.opacity(0.1)))
        .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Color.orange.opacity(0.4)))
    }
}
