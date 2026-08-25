import Foundation

struct BlogSection: Identifiable, Codable, Equatable {
    var id: String = UUID().uuidString
    var type: String = "text" // "title" | "subtitle" | "text" | "image" | "map"
    var value: String = ""
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
            "sections": sections.map { ["type": $0.type, "value": $0.value] },
        ]
    }

    static func from(id: String, dict: [String: Any]) -> BlogPost {
        let sectionsRaw = dict["sections"] as? [[String: Any]] ?? []
        let sections = sectionsRaw.map {
            BlogSection(type: $0["type"] as? String ?? "text", value: $0["value"] as? String ?? "")
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
