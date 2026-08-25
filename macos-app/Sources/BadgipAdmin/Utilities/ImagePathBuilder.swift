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

    /// Same idea as the project variants above, but for custom-section item
    /// icons: "assets/sections/<sectionId>/<filename>" on the repo side,
    /// "sections/<sectionId>/<filename>" as the RTDB-stored/site-facing path.
    static func sectionIconRepoPath(sectionId: String, filename: String) -> String {
        let safeId = sectionId.isEmpty ? "untitled" : sectionId
        return "assets/sections/\(safeId)/\(filename)"
    }

    static func sectionIconStoredPath(sectionId: String, filename: String) -> String {
        let safeId = sectionId.isEmpty ? "untitled" : sectionId
        return "sections/\(safeId)/\(filename)"
    }

    /// Same idea, for blog post images: "assets/blog/<slug>/<filename>" repo
    /// side, "blog/<slug>/<filename>" as the RTDB-stored/site-facing path.
    static func blogImageRepoPath(slug: String, filename: String) -> String {
        let safeSlug = slug.isEmpty ? "untitled" : slug
        return "assets/blog/\(safeSlug)/\(filename)"
    }

    static func blogImageStoredPath(slug: String, filename: String) -> String {
        let safeSlug = slug.isEmpty ? "untitled" : slug
        return "blog/\(safeSlug)/\(filename)"
    }

    /// The contact section's single background photo:
    /// "assets/site/contact-bg-<filename>" repo side, "site/contact-bg-<filename>" stored.
    static func contactBackgroundRepoPath(filename: String) -> String {
        "assets/site/contact-bg-\(filename)"
    }

    static func contactBackgroundStoredPath(filename: String) -> String {
        "site/contact-bg-\(filename)"
    }

    /// The hero section's optional profile picture:
    /// "assets/site/profile-<filename>" repo side, "site/profile-<filename>" stored.
    static func heroProfileRepoPath(filename: String) -> String {
        "assets/site/profile-\(filename)"
    }

    static func heroProfileStoredPath(filename: String) -> String {
        "site/profile-\(filename)"
    }

    /// A professional-timeline entry's optional company logo:
    /// "assets/timeline/<entryId>/<filename>" repo side, "timeline/<entryId>/<filename>" stored.
    static func timelineLogoRepoPath(entryId: String, filename: String) -> String {
        let safeId = entryId.isEmpty ? "untitled" : entryId
        return "assets/timeline/\(safeId)/\(filename)"
    }

    static func timelineLogoStoredPath(entryId: String, filename: String) -> String {
        let safeId = entryId.isEmpty ? "untitled" : entryId
        return "timeline/\(safeId)/\(filename)"
    }
}
