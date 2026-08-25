import Foundation

enum JsDelivrService {
    /// Purges the CDN cache for a file. Takes the full repo-relative path
    /// (e.g. "assets/projects/my-app/cover.jpg") — jsDelivr's purge
    /// endpoint always operates on the real repo path, not an
    /// assets-relative one.
    static func purge(repoPath: String) async {
        let url = URL(string: "https://purge.jsdelivr.net/gh/\(GitHubService.owner)/\(GitHubService.repo)@\(GitHubService.branch)/\(repoPath)")!
        _ = try? await URLSession.shared.data(from: url)
    }

    /// Composes the CDN URL for a stored path — i.e. the value actually
    /// saved in RTDB's coverImage/gallery fields, which is relative to
    /// `assets/` (matches js/config.js's jsDelivrBase convention).
    static func composeURL(forStoredPath storedPath: String) -> URL? {
        URL(string: "https://cdn.jsdelivr.net/gh/\(GitHubService.owner)/\(GitHubService.repo)@\(GitHubService.branch)/assets/\(storedPath)")
    }
}
