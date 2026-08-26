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

struct HighlightKeyword: Identifiable, Codable, Equatable {
    var id: String = UUID().uuidString
    var keyword: String = ""
    var color: String = "#3effa3"

    var asDictionary: [String: Any] {
        ["id": id, "keyword": keyword, "color": color]
    }

    static func from(_ dict: [String: Any]) -> HighlightKeyword {
        HighlightKeyword(
            id: dict["id"] as? String ?? UUID().uuidString,
            keyword: dict["keyword"] as? String ?? "",
            color: dict["color"] as? String ?? "#3effa3"
        )
    }
}

struct AboutContent: Codable, Equatable {
    var professionalBio: String = ""
    var personalBio: String = ""
    var professionalTimeline: [TimelineEntry] = []
    var personalTimeline: [TimelineEntry] = []
    // 0 means "use the site's default font size" — matches the website's
    // own sentinel (js/data-service.js's DEFAULT_ABOUT).
    var professionalBioFontSize: Int = 0
    var personalBioFontSize: Int = 0
    var professionalHighlights: [HighlightKeyword] = []
    var personalHighlights: [HighlightKeyword] = []

    var asDictionary: [String: Any] {
        [
            "professionalBio": professionalBio,
            "personalBio": personalBio,
            "professionalTimeline": professionalTimeline.map { $0.asDictionary },
            "personalTimeline": personalTimeline.map { $0.asDictionary },
            "professionalBioFontSize": professionalBioFontSize,
            "personalBioFontSize": personalBioFontSize,
            "professionalHighlights": professionalHighlights.map { $0.asDictionary },
            "personalHighlights": personalHighlights.map { $0.asDictionary },
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
        about.professionalBioFontSize = dict["professionalBioFontSize"] as? Int ?? 0
        about.personalBioFontSize = dict["personalBioFontSize"] as? Int ?? 0
        if let items = dict["professionalHighlights"] as? [[String: Any]] {
            about.professionalHighlights = items.map { HighlightKeyword.from($0) }
        }
        if let items = dict["personalHighlights"] as? [[String: Any]] {
            about.personalHighlights = items.map { HighlightKeyword.from($0) }
        }
        return about
    }
}
