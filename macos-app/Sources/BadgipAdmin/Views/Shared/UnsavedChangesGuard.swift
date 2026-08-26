import SwiftUI

/// Shared across the app so screens with a deliberate Save button (About,
/// Settings — everything else auto-persists each action instantly) can
/// report whether they currently have unsaved edits, and the sidebar can
/// warn before discarding them on navigation instead of silently losing
/// whatever was typed.
@MainActor
final class UnsavedChangesGuard: ObservableObject {
    @Published var hasUnsavedChanges = false
}
