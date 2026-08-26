import Foundation

struct SectionItem: Identifiable, Codable, Equatable {
    var id: String = UUID().uuidString
    var icon: String = "" // emoji, or an image URL / repo-relative asset path
    var label: String = ""
    var order: Int = 0
}

struct PageSection: Identifiable, Codable, Equatable {
    var id: String
    var kind: String = "custom" // "about" | "projects" | "youtube" | "blog" | "custom"
    var mode: String = "professional" // "professional" | "personal"
    var order: Int = 0
    // Whether this section gets an entry in the floating nav pill. It always
    // stays on the page (in its own scroll position) either way — this only
    // controls whether it's also one of the compact nav tabs.
    var showInNav: Bool = true
    var title: String = "" // custom only
    var items: [SectionItem] = [] // custom only

    var isBuiltIn: Bool { kind != "custom" }

    var displayName: String {
        switch kind {
        case "about": return "About"
        case "projects": return "Projects"
        case "youtube": return "YouTube"
        case "blog": return "Blog"
        default: return title.isEmpty ? "Untitled Section" : title
        }
    }

    var systemImage: String {
        switch kind {
        case "about": return "person.text.rectangle"
        case "projects": return "folder"
        case "youtube": return "play.rectangle"
        case "blog": return "doc.richtext"
        default: return "square.grid.2x2"
        }
    }

    var asDictionary: [String: Any] {
        var dict: [String: Any] = ["kind": kind, "mode": mode, "order": order, "showInNav": showInNav]
        if kind == "custom" {
            dict["title"] = title
            dict["items"] = items.map { ["id": $0.id, "icon": $0.icon, "label": $0.label, "order": $0.order] }
        }
        return dict
    }

    static func from(id: String, dict: [String: Any]) -> PageSection {
        let itemsRaw = dict["items"] as? [[String: Any]] ?? []
        // `id` round-trips through RTDB (same reasoning as TimelineEntry in
        // AboutContent.swift) so a re-fetch — reopening this screen, or
        // relaunching the app — doesn't hand every item a fresh random id.
        let items = itemsRaw.enumerated().map { index, item -> SectionItem in
            SectionItem(
                id: item["id"] as? String ?? UUID().uuidString,
                icon: item["icon"] as? String ?? "",
                label: item["label"] as? String ?? "",
                order: item["order"] as? Int ?? index
            )
        }
        return PageSection(
            id: id,
            kind: dict["kind"] as? String ?? "custom",
            mode: dict["mode"] as? String ?? "professional",
            order: dict["order"] as? Int ?? 0,
            showInNav: dict["showInNav"] as? Bool ?? true,
            title: dict["title"] as? String ?? "",
            items: items
        )
    }
}
