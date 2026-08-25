import Foundation

struct TimelineEntry: Identifiable, Codable, Equatable {
    var id: String = UUID().uuidString
    var year: String = ""
    var endYear: String = ""
    var title: String = ""
    var description: String = ""
    var logo: String = ""

    var asDictionary: [String: Any] {
        ["id": id, "year": year, "endYear": endYear, "title": title, "description": description, "logo": logo]
    }

    // `id` round-trips through RTDB (unlike most other fields here, it's
    // read back out) so a timeline entry's logo upload path stays stable
    // across app relaunches instead of a fresh UUID orphaning a new GitHub
    // file on every re-upload.
    static func from(_ dict: [String: Any]) -> TimelineEntry {
        TimelineEntry(
            id: dict["id"] as? String ?? UUID().uuidString,
            year: dict["year"] as? String ?? "",
            endYear: dict["endYear"] as? String ?? "",
            title: dict["title"] as? String ?? "",
            description: dict["description"] as? String ?? "",
            logo: dict["logo"] as? String ?? ""
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
