import Foundation

struct BlogSection: Identifiable, Codable, Equatable {
    var id: String = UUID().uuidString
    var type: String = "text" // "title" | "subtitle" | "text" | "image" | "code" | "map"
    var value: String = ""
    // Optional caption any section can carry above its content (distinct
    // from the standalone "title"/"subtitle" section types) — e.g. a small
    // heading over a code block or image.
    var title: String = ""
    var subtitle: String = ""
    // Optional per-section look override — empty means "use site defaults".
    var accentColor: String = ""
    var textColor: String = ""
}

struct BlogPost: Identifiable, Codable, Equatable {
    var id: String
    var slug: String = ""
    var coverImage: String = ""
    var publishedAt: Double = 0
    var status: String = "draft" // "draft" | "published"
    var order: Int = 0
    var sections: [BlogSection] = []

    var asDictionary: [String: Any] {
        [
            "slug": slug,
            "coverImage": coverImage,
            "publishedAt": publishedAt,
            "status": status,
            "order": order,
            "sections": sections.map {
                ["type": $0.type, "value": $0.value, "title": $0.title, "subtitle": $0.subtitle, "accentColor": $0.accentColor, "textColor": $0.textColor]
            },
        ]
    }

    static func from(id: String, dict: [String: Any]) -> BlogPost {
        let sectionsRaw = dict["sections"] as? [[String: Any]] ?? []
        let sections = sectionsRaw.map {
            BlogSection(
                type: $0["type"] as? String ?? "text",
                value: $0["value"] as? String ?? "",
                title: $0["title"] as? String ?? "",
                subtitle: $0["subtitle"] as? String ?? "",
                accentColor: $0["accentColor"] as? String ?? "",
                textColor: $0["textColor"] as? String ?? ""
            )
        }
        return BlogPost(
            id: id,
            slug: dict["slug"] as? String ?? "",
            coverImage: dict["coverImage"] as? String ?? "",
            publishedAt: dict["publishedAt"] as? Double ?? 0,
            status: dict["status"] as? String ?? "draft",
            order: dict["order"] as? Int ?? 0,
            sections: sections
        )
    }
}
