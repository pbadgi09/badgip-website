import SwiftUI

/// A bottom toast with a message and an Undo button, used for reversible
/// destructive actions (deleting a project/message). Unlike SavedToast it's
/// interactive — it stays up for a few seconds so the user can click Undo,
/// and runs a `commit` closure (e.g. the real file cleanup) when the window
/// lapses without an undo.
@MainActor
final class UndoToastController: ObservableObject {
    @Published fileprivate(set) var isVisible = false
    @Published fileprivate(set) var message = ""
    fileprivate var undo: (() -> Void)?
    private var commit: (() -> Void)?
    private var task: Task<Void, Never>?

    /// Shows the toast. `onUndo` restores the item; `onCommit` finalizes the
    /// deletion (deferred until the window lapses, cancelled on undo).
    func show(message: String, seconds: Double = 6, onUndo: @escaping () -> Void, onCommit: @escaping () -> Void) {
        // A pending commit from a previous toast must still run (we're about
        // to replace it) so its cleanup isn't silently dropped.
        commit?()
        task?.cancel()

        self.message = message
        self.undo = onUndo
        self.commit = onCommit
        isVisible = true

        let nanos = UInt64(seconds * 1_000_000_000)
        task = Task { [weak self] in
            try? await Task.sleep(nanoseconds: nanos)
            guard !Task.isCancelled else { return }
            self?.finish(runCommit: true)
        }
    }

    fileprivate func performUndo() {
        task?.cancel()
        let action = undo
        commit = nil
        finish(runCommit: false)
        action?()
    }

    private func finish(runCommit: Bool) {
        isVisible = false
        undo = nil
        if runCommit {
            let c = commit
            commit = nil
            c?()
        }
    }
}

private struct UndoToastOverlay: View {
    @ObservedObject var controller: UndoToastController

    var body: some View {
        if controller.isVisible {
            HStack(spacing: 12) {
                Text(controller.message).font(.callout)
                Button("Undo") { controller.performUndo() }
                    .buttonStyle(.plain)
                    .font(.callout.weight(.semibold))
                    .foregroundStyle(.badgipAccent)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Capsule().fill(Color.badgipSurfaceHover))
            .overlay(Capsule().strokeBorder(Color.badgipBorder))
            .shadow(color: .black.opacity(0.18), radius: 10, y: 3)
            .transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }
}

extension View {
    @MainActor
    func undoToast(_ controller: UndoToastController) -> some View {
        overlay(alignment: .bottom) {
            UndoToastOverlay(controller: controller)
                .padding(.bottom, 20)
                .animation(.spring(response: 0.35, dampingFraction: 0.8), value: controller.isVisible)
        }
    }
}
