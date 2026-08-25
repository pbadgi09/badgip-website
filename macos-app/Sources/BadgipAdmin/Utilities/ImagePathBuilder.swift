import Foundation

enum ImagePathBuilder {
    /// Full repo-relative path (e.g. "assets/projects/my-app/cover.jpg") —
    /// what GitHubService commits to and what JsDelivrService's purge
    /// endpoint needs (it purges by full repo path, not asset-relative).
    static func repoPath(slug: String, filename: String) -> String {
        let safeSlug = slug.isEmpty ? "untitled" : slug
        return "assets/projects/\(safeSlug)/\(filename)"
    }

    /// Path relative to `assets/` — this is what actually gets stored in
    /// RTDB's coverImage/gallery fields, matching js/config.js's
    /// jsDelivrBase (which already ends in "/assets"). Storing the full
    /// repo path here instead would produce a broken double "assets/assets/"
    /// URL on the site.
    static func storedPath(slug: String, filename: String) -> String {
        let safeSlug = slug.isEmpty ? "untitled" : slug
        return "projects/\(safeSlug)/\(filename)"
    }
}
