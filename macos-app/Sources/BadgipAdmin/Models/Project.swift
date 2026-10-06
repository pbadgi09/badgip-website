import Foundation

// One button in the project detail's left-column CTA list. `href` may be an
// in-page anchor (#projects / #contact) or any external URL.
struct ProjectCTA: Identifiable, Codable, Equatable {
    var id: String = UUID().uuidString
    var text: String = ""
    var href: String = ""

    var asDictionary: [String: Any] {
        ["id": id, "text": text, "href": href]
    }

    static func from(_ dict: [String: Any]) -> ProjectCTA {
        ProjectCTA(
            id: dict["id"] as? String ?? UUID().uuidString,
            text: dict["text"] as? String ?? "",
            href: dict["href"] as? String ?? ""
        )
    }
}

// One tile in the right-column Pinterest-style mosaic. `type` discriminates:
// "carousel" (swipeable project images), "video" (YouTube embed), "tags"
// (the project's tag chips), or a generic "text" / "image" / "both" tile.
// Field keys here must match what js/render-projects.js reads.
struct ProjectTile: Identifiable, Codable, Equatable {
    var id: String = UUID().uuidString
    var type: String = "text" // carousel | video | tags | text | image | both
    var fullWidth: Bool = false
    // content
    var text: String = ""
    var image: String = ""      // generic image/both tile (stored path)
    var images: [String] = []   // carousel tile
    var videoUrl: String = ""   // video tile
    var href: String = ""       // "" = not clickable
    // style
    var textColor: String = ""
    var bgColor: String = ""
    var fontSize: Int = 0       // 0 = default
    var textAlign: String = "left"  // left | center | right
    var imageFit: String = "cover"  // cover | contain
    var highlights: [HighlightKeyword] = []

    var asDictionary: [String: Any] {
        [
            "id": id,
            "type": type,
            "fullWidth": fullWidth,
            "text": text,
            "image": image,
            "images": images,
            "videoUrl": videoUrl,
            "href": href,
            "textColor": textColor,
            "bgColor": bgColor,
            "fontSize": fontSize,
            "textAlign": textAlign,
            "imageFit": imageFit,
            "highlights": highlights.map { $0.asDictionary },
        ]
    }

    static func from(_ dict: [String: Any]) -> ProjectTile {
        var tile = ProjectTile(
            id: dict["id"] as? String ?? UUID().uuidString,
            type: dict["type"] as? String ?? "text",
            fullWidth: dict["fullWidth"] as? Bool ?? false,
            text: dict["text"] as? String ?? "",
            image: dict["image"] as? String ?? "",
            images: dict["images"] as? [String] ?? [],
            videoUrl: dict["videoUrl"] as? String ?? "",
            href: dict["href"] as? String ?? "",
            textColor: dict["textColor"] as? String ?? "",
            bgColor: dict["bgColor"] as? String ?? "",
            fontSize: dict["fontSize"] as? Int ?? 0,
            textAlign: dict["textAlign"] as? String ?? "left",
            imageFit: dict["imageFit"] as? String ?? "cover"
        )
        if let items = dict["highlights"] as? [[String: Any]] {
            tile.highlights = items.map { HighlightKeyword.from($0) }
        }
        return tile
    }
}

struct Project: Identifiable, Codable, Equatable {
    var id: String
    var title: String = ""
    var slug: String = ""
    var summary: String = ""
    var description: String = ""
    var tags: [String] = []
    var coverImage: String = ""
    var gallery: [String] = []
    var youtubeUrl: String = ""
    var liveUrl: String = ""
    var repoUrl: String = ""
    var featured: Bool = false
    var order: Int = 0
    var status: String = "draft" // "draft" | "published"
    var category: String = "professional" // "professional" | "personal"
    // Optional per-project look override for the full-screen detail view —
    // empty string means "use the site's default accent/text colors".
    var accentColor: String = ""
    var textColor: String = ""
    // 0 means "use the site's default font size" for the detail-view title
    // chip — matches the About bio's professionalBioFontSize convention.
    var titleFontSize: Int = 0
    // Empty string means "Live Site" (the site's default button label).
    var liveButtonLabel: String = ""
    // New two-column detail layout (see js/render-projects.js). The left
    // column uses dedicated fields; the right column is an ordered mosaic of
    // tiles. Empty values make the website fall back to the legacy fields
    // (title/summary/description/cover+gallery) so pre-redesign projects
    // keep rendering until re-saved here.
    var heroTitle: String = ""
    var subtitle: String = ""
    var caption: String = ""
    var ctas: [ProjectCTA] = []
    var tiles: [ProjectTile] = []
    var createdAt: Double = 0
    var updatedAt: Double = 0

    /// Every stored image path this project references (cover + gallery +
    /// mosaic tile images) — used for reference-safe cleanup on delete so
    /// tile/carousel images aren't left orphaned.
    var allImagePaths: [String] {
        var paths = [coverImage] + gallery
        for tile in tiles {
            if !tile.image.isEmpty { paths.append(tile.image) }
            paths.append(contentsOf: tile.images)
        }
        return paths.filter { !$0.isEmpty }
    }

    var asDictionary: [String: Any] {
        [
            "title": title,
            "slug": slug,
            "summary": summary,
            "description": description,
            "tags": tags,
            "coverImage": coverImage,
            "gallery": gallery,
            "youtubeUrl": youtubeUrl,
            "liveUrl": liveUrl,
            "repoUrl": repoUrl,
            "featured": featured,
            "order": order,
            "status": status,
            "category": category,
            "accentColor": accentColor,
            "textColor": textColor,
            "titleFontSize": titleFontSize,
            "liveButtonLabel": liveButtonLabel,
            "heroTitle": heroTitle,
            "subtitle": subtitle,
            "caption": caption,
            "ctas": ctas.map { $0.asDictionary },
            "tiles": tiles.map { $0.asDictionary },
            "createdAt": createdAt,
            "updatedAt": updatedAt,
        ]
    }

    static func from(id: String, dict: [String: Any]) -> Project {
        var project = Project(
            id: id,
            title: dict["title"] as? String ?? "",
            slug: dict["slug"] as? String ?? "",
            summary: dict["summary"] as? String ?? "",
            description: dict["description"] as? String ?? "",
            tags: dict["tags"] as? [String] ?? [],
            coverImage: dict["coverImage"] as? String ?? "",
            gallery: dict["gallery"] as? [String] ?? [],
            youtubeUrl: dict["youtubeUrl"] as? String ?? "",
            liveUrl: dict["liveUrl"] as? String ?? "",
            repoUrl: dict["repoUrl"] as? String ?? "",
            featured: dict["featured"] as? Bool ?? false,
            order: dict["order"] as? Int ?? 0,
            status: dict["status"] as? String ?? "draft",
            category: dict["category"] as? String ?? "professional",
            accentColor: dict["accentColor"] as? String ?? "",
            textColor: dict["textColor"] as? String ?? "",
            titleFontSize: dict["titleFontSize"] as? Int ?? 0,
            liveButtonLabel: dict["liveButtonLabel"] as? String ?? "",
            heroTitle: dict["heroTitle"] as? String ?? "",
            subtitle: dict["subtitle"] as? String ?? "",
            caption: dict["caption"] as? String ?? "",
            createdAt: dict["createdAt"] as? Double ?? 0,
            updatedAt: dict["updatedAt"] as? Double ?? 0
        )
        if let items = dict["ctas"] as? [[String: Any]] {
            project.ctas = items.map { ProjectCTA.from($0) }
        }
        if let items = dict["tiles"] as? [[String: Any]] {
            project.tiles = items.map { ProjectTile.from($0) }
        }
        return project
    }
}
