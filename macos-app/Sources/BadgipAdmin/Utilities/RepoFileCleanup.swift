import Foundation

/// Best-effort cleanup of repo-hosted image files when the RTDB item that
/// referenced them is deleted (or a single image within it is removed).
/// Fire-and-forget: a failure here (bad PAT, network, already gone) must
/// never block or fail the RTDB deletion the user actually asked for —
/// it's logged instead of surfaced as a blocking error.
enum RepoFileCleanup {
    private static let githubService = GitHubService()

    /// True for anything that isn't an external http(s) URL or empty —
    /// i.e. a real repo-relative stored path this app owns and can delete.
    /// Not safe to use on a field that can also hold an emoji (section
    /// item icons) — use `isInternalImagePath` there instead.
    static func isInternalPath(_ path: String) -> Bool {
        guard !path.isEmpty else { return false }
        let lowered = path.lowercased()
        return !lowered.hasPrefix("http://") && !lowered.hasPrefix("https://")
    }

    /// Same idea, but for fields that can also hold a non-path value like
    /// an emoji (section item icons) — an internal stored path always ends
    /// in a real image extension; an emoji or arbitrary short string never
    /// does. Mirrors the isImagePath check already used in
    /// CustomSectionEditView.swift.
    static func isInternalImagePath(_ path: String) -> Bool {
        guard isInternalPath(path) else { return false }
        let lowered = path.lowercased()
        return [".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"].contains { lowered.hasSuffix($0) }
    }

    /// `storedPath` is RTDB's assets/-relative path; the repo path
    /// GitHub's Contents API needs is always exactly "assets/" + that —
    /// every ImagePathBuilder repoPath/storedPath pair follows this rule.
    static func deleteStoredImage(_ storedPath: String, commitMessage: String) {
        guard isInternalPath(storedPath) else { return }
        let repoPath = "assets/\(storedPath)"
        Task {
            // Images can now be reused across multiple fields (the "choose
            // existing" picker) — deleting the underlying file just because
            // *one* reference to it was removed would silently break every
            // other place still pointing at it. A fresh scan (not
            // in-memory state) is what makes this correct regardless of
            // which screen is calling in: the caller already saved its own
            // change to RTDB before reaching this point.
            if await ImageReferenceScanner.isPathStillUsed(storedPath) {
                return
            }
            do {
                try await githubService.deleteFile(path: repoPath, commitMessage: commitMessage)
            } catch {
                print("RepoFileCleanup: failed to delete \(repoPath): \(error.localizedDescription)")
            }
        }
    }

    static func deleteStoredImages(_ paths: [String], commitMessage: String) {
        for path in paths { deleteStoredImage(path, commitMessage: commitMessage) }
    }

    /// Icon-specific variant — skips emoji/non-path icon values instead of
    /// (harmlessly, but pointlessly) trying to delete them as a file.
    static func deleteStoredIcon(_ path: String, commitMessage: String) {
        guard isInternalImagePath(path) else { return }
        deleteStoredImage(path, commitMessage: commitMessage)
    }
}
