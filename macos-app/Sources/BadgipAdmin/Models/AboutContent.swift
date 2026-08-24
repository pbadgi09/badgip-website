import Foundation

struct TimelineEntry: Identifiable, Codable, Equatable {
    var id: String = UUID().uuidString
    var year: String = ""
    var title: String = ""
    var description: String = ""
    var order: Int = 0

    var asDictionary: [String: Any] {
        ["year": year, "title": title, "description": description, "order": order]
    }

    static func from(_ dict: [String: Any]) -> TimelineEntry {
        TimelineEntry(
            year: dict["year"] as? String ?? "",
            title: dict["title"] as? String ?? "",
            description: dict["description"] as? String ?? "",
            order: dict["order"] as? Int ?? 0
        )
    }
}

struct AboutContent: Codable, Equatable {
    var professionalBio: String = ""
    var personalBio: String = ""
    var professionalTimeline: [TimelineEntry] = []
    var personalTimeline: [TimelineEntry] = []

    var asDictionary: [String: Any] {
        [
            "professionalBio": professionalBio,
            "personalBio": personalBio,
            "professionalTimeline": professionalTimeline.map { $0.asDictionary },
            "personalTimeline": personalTimeline.map { $0.asDictionary },
        ]
    }

    static func from(_ dict: [String: Any]) -> AboutContent {
        var about = AboutContent()
        about.professionalBio = dict["professionalBio"] as? String ?? ""
        about.personalBio = dict["personalBio"] as? String ?? ""
        if let items = dict["professionalTimeline"] as? [[String: Any]] {
            about.professionalTimeline = items.map { TimelineEntry.from($0) }
        }
        if let items = dict["personalTimeline"] as? [[String: Any]] {
            about.personalTimeline = items.map { TimelineEntry.from($0) }
        }
        return about
    }
}
