import Foundation

/// One place an image is currently used, for display in the "choose
/// existing" picker.
struct ImageReference: Identifiable {
    var id: String { path }
    let path: String
    let label: String
}

/// Scans every image-bearing field across the site's content for its
/// current stored path — the source list for the "choose an existing
/// image instead of uploading a new one" picker, and also what makes
/// deletion reference-safe: an image reused in two places must not
/// disappear from one just because the other stopped using it.
@MainActor
enum ImageReferenceScanner {
    static func scanAll() async -> [ImageReference] {
        let rtdb = RTDBService()
        async let projects = (try? await rtdb.fetchProjects()) ?? []
        async let posts = (try? await rtdb.fetchBlogPosts()) ?? []
        async let sections = (try? await rtdb.fetchPageSections()) ?? []
        async let settings = try? await rtdb.fetchSettings()
        async let about = try? await rtdb.fetchAbout()

        var refs: [ImageReference] = []

        for project in await projects {
            if !project.coverImage.isEmpty {
                refs.append(ImageReference(path: project.coverImage, label: "\(project.title) — Cover"))
            }
            for path in project.gallery where !path.isEmpty {
                refs.append(ImageReference(path: path, label: "\(project.title) — Gallery"))
            }
        }

        for post in await posts {
            let title = post.sections.first(where: { $0.type == "title" })?.value ?? "Untitled Post"
            if !post.coverImage.isEmpty {
                refs.append(ImageReference(path: post.coverImage, label: "\(title) — Cover"))
            }
            for section in post.sections where section.type == "image" && !section.value.isEmpty {
                refs.append(ImageReference(path: section.value, label: "\(title) — Image"))
            }
        }

        for section in await sections where section.kind == "custom" {
            for item in section.items where RepoFileCleanup.isInternalImagePath(item.icon) {
                let itemLabel = item.label.isEmpty ? "Icon" : item.label
                refs.append(ImageReference(path: item.icon, label: "\(section.displayName) — \(itemLabel)"))
            }
        }

        if let settings = await settings {
            if !settings.profileImage.isEmpty {
                refs.append(ImageReference(path: settings.profileImage, label: "Hero — Profile Picture"))
            }
            if !settings.contactBackgroundImage.isEmpty {
                refs.append(ImageReference(path: settings.contactBackgroundImage, label: "Contact — Background Photo"))
            }
            if RepoFileCleanup.isInternalPath(settings.ogImage) {
                refs.append(ImageReference(path: settings.ogImage, label: "Social Preview Image"))
            }
            for item in settings.contactInfoItems where RepoFileCleanup.isInternalImagePath(item.icon) {
                refs.append(ImageReference(path: item.icon, label: "Contact Info — \(item.label.isEmpty ? "Icon" : item.label)"))
            }
            for link in settings.contactSocialLinks where RepoFileCleanup.isInternalImagePath(link.icon) {
                refs.append(ImageReference(path: link.icon, label: "Footer Icon"))
            }
        }

        if let about = await about {
            for entry in about.professionalTimeline where RepoFileCleanup.isInternalPath(entry.logo) {
                refs.append(ImageReference(path: entry.logo, label: "Professional Timeline — \(entry.title.isEmpty ? "Logo" : entry.title)"))
            }
            for entry in about.personalTimeline where RepoFileCleanup.isInternalPath(entry.logo) {
                refs.append(ImageReference(path: entry.logo, label: "Personal Timeline — \(entry.title.isEmpty ? "Logo" : entry.title)"))
            }
        }

        // One thumbnail per unique file, not one per place it's used —
        // keeps the first label seen for a path that shows up more than
        // once.
        var seen = Set<String>()
        return refs.filter { seen.insert($0.path).inserted }
    }

    /// Whether any content still references `path` — checked fresh (not
    /// against in-memory state) so this is correct regardless of which
    /// screen is asking. Every call site in this app already saves/deletes
    /// its own change to RTDB *before* running cleanup, so a fresh scan at
    /// that point naturally reflects the caller's own removal too — no
    /// need to separately exclude "the place I'm about to remove this
    /// from", it's already gone from RTDB by the time this runs.
    static func isPathStillUsed(_ path: String) async -> Bool {
        guard !path.isEmpty else { return false }
        return await scanAll().contains { $0.path == path }
    }
}
