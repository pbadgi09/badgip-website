import Foundation

enum JsDelivrService {
    /// Path segments routinely contain spaces or other characters that
    /// aren't valid in a raw URL (the filename comes straight from a
    /// user-picked file, e.g. "Screenshot 2026-08-25 at 12.46.26 PM.png") —
    /// encode each segment so building the URL can't silently produce a
    /// broken/nil URL.
    private static func encodedPath(_ path: String) -> String {
        path
            .split(separator: "/")
            .map { $0.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? String($0) }
            .joined(separator: "/")
    }

    /// Purges the CDN cache for a file. Takes the full repo-relative path
    /// (e.g. "assets/projects/my-app/cover.jpg") — jsDelivr's purge
    /// endpoint always operates on the real repo path, not an
    /// assets-relative one.
    static func purge(repoPath: String) async {
        guard let url = URL(string: "https://purge.jsdelivr.net/gh/\(GitHubService.owner)/\(GitHubService.repo)@\(GitHubService.branch)/\(encodedPath(repoPath))") else {
            return
        }
        _ = try? await URLSession.shared.data(from: url)
    }

    /// Composes the CDN URL for a stored path — i.e. the value actually
    /// saved in RTDB's coverImage/gallery fields, which is relative to
    /// `assets/` (matches js/config.js's jsDelivrBase convention).
    static func composeURL(forStoredPath storedPath: String) -> URL? {
        URL(string: "https://cdn.jsdelivr.net/gh/\(GitHubService.owner)/\(GitHubService.repo)@\(GitHubService.branch)/assets/\(encodedPath(storedPath))")
    }
}
