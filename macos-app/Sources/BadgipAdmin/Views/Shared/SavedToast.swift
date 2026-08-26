import SwiftUI

/// Drives a brief "Saved" confirmation. Used two ways: `.flash()` (default
/// ~1.5s) after screens where every action — reorder, toggle, delete, mark-
/// read — persists immediately with no pending-changes/Save-button step of
/// its own; and `.flash(duration:)` with a longer duration by the screens
/// that already have a deliberate Save button (About, Settings), matching
/// their previous longer-lived badge. Cancels any timer still running from
/// a previous flash so rapid actions don't fight over when it disappears.
@MainActor
final class SavedToastController: ObservableObject {
    @Published fileprivate(set) var isVisible = false
    private var hideTask: Task<Void, Never>?

    // `Task.sleep(nanoseconds:)`, not the newer Duration-based `.sleep(for:)`
    // — this app targets macOS 12, and Duration/Clock need macOS 13+.
    func flash(seconds: Double = 1.5) {
        hideTask?.cancel()
        isVisible = true
        let nanoseconds = UInt64(seconds * 1_000_000_000)
        hideTask = Task {
            try? await Task.sleep(nanoseconds: nanoseconds)
            guard !Task.isCancelled else { return }
            isVisible = false
        }
    }
}

private struct SavedToastOverlay: View {
    @ObservedObject var controller: SavedToastController

    var body: some View {
        if controller.isVisible {
            HStack(spacing: 6) {
                Image(systemName: "checkmark.circle.fill")
                Text("Saved").font(.callout.weight(.semibold))
            }
            .foregroundStyle(.black)
            .padding(.horizontal, 14)
            .padding(.vertical, 7)
            .background(Capsule().fill(Color.badgipAccent))
            .shadow(color: .black.opacity(0.15), radius: 8, y: 2)
            .transition(.move(edge: .top).combined(with: .opacity))
        }
    }
}

extension View {
    /// Anchors a `SavedToast` pill to the top-trailing corner of this view.
    @MainActor
    func savedToast(_ controller: SavedToastController) -> some View {
        overlay(alignment: .top) {
            SavedToastOverlay(controller: controller)
                .padding(.top, 12)
                .animation(.spring(response: 0.35, dampingFraction: 0.75), value: controller.isVisible)
                .allowsHitTesting(false)
        }
    }
}
