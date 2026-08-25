import Foundation

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
    var createdAt: Double = 0
    var updatedAt: Double = 0

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
            "createdAt": createdAt,
            "updatedAt": updatedAt,
        ]
    }

    static func from(id: String, dict: [String: Any]) -> Project {
        Project(
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
            createdAt: dict["createdAt"] as? Double ?? 0,
            updatedAt: dict["updatedAt"] as? Double ?? 0
        )
    }
}
