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

    /// A blog post can have multiple image-type sections — namespaced by
    /// section id (not just slug) so two sections that happen to upload a
    /// same-named file (e.g. two different "IMG_0001.jpg" photos) don't
    /// silently overwrite each other in the repo.
    static func blogSectionImageRepoPath(slug: String, sectionId: String, filename: String) -> String {
        let safeSlug = slug.isEmpty ? "untitled" : slug
        return "assets/blog/\(safeSlug)/sections/\(sectionId)/\(filename)"
    }

    static func blogSectionImageStoredPath(slug: String, sectionId: String, filename: String) -> String {
        let safeSlug = slug.isEmpty ? "untitled" : slug
        return "blog/\(safeSlug)/sections/\(sectionId)/\(filename)"
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

    /// A contact info row or contact social link's icon, when uploaded
    /// rather than typed as an emoji/URL: "assets/site/contact-icons/<itemId>/<filename>"
    /// repo side, "site/contact-icons/<itemId>/<filename>" stored.
    static func contactIconRepoPath(itemId: String, filename: String) -> String {
        let safeId = itemId.isEmpty ? "untitled" : itemId
        return "assets/site/contact-icons/\(safeId)/\(filename)"
    }

    static func contactIconStoredPath(itemId: String, filename: String) -> String {
        let safeId = itemId.isEmpty ? "untitled" : itemId
        return "site/contact-icons/\(safeId)/\(filename)"
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

    /// The Open Graph preview image: "assets/site/og-image-<filename>" repo
    /// side, "site/og-image-<filename>" stored. Unlike other images, this
    /// one also needs a stable direct-domain URL (not jsDelivr) for
    /// index.html's static <meta property="og:image"> tag — social-media
    /// crawlers read that tag straight from the static HTML and don't run
    /// JS, so it has to be right immediately, with no CDN purge delay.
    static func ogImageRepoPath(filename: String) -> String {
        "assets/site/og-image-\(filename)"
    }

    static func ogImageStoredPath(filename: String) -> String {
        "site/og-image-\(filename)"
    }

    /// `storedPath` is the assets/-relative path (as returned by
    /// `SingleImageUploadView`'s `onUploaded` callback) — every stored path
    /// maps to "assets/" + itself on the real repo/site, same rule
    /// RepoFileCleanup relies on.
    static func ogImageSiteURL(storedPath: String) -> String {
        "https://www.itspranavbadgi.com/assets/\(storedPath)"
    }
}
