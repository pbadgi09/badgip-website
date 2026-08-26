import Foundation

/// Optional — the site only shows a channel card (avatar + name, linking
/// out to the channel) once a URL is actually set. Its own RTDB node
/// rather than living on SiteSettings, so editing it here can't race with
/// SiteSettingsView independently loading/saving the same big blob.
struct YoutubeChannel: Codable, Equatable {
    var name: String = ""
    var url: String = ""
    var avatarImage: String = ""

    var asDictionary: [String: Any] {
        ["name": name, "url": url, "avatarImage": avatarImage]
    }

    static func from(_ dict: [String: Any]) -> YoutubeChannel {
        YoutubeChannel(
            name: dict["name"] as? String ?? "",
            url: dict["url"] as? String ?? "",
            avatarImage: dict["avatarImage"] as? String ?? ""
        )
    }
}

struct YoutubeVideo: Identifiable, Codable, Equatable {
    var id: String
    var url: String = ""
    var title: String = ""
    var order: Int = 0

    var asDictionary: [String: Any] {
        ["url": url, "title": title, "order": order]
    }

    static func from(id: String, dict: [String: Any]) -> YoutubeVideo {
        YoutubeVideo(
            id: id,
            url: dict["url"] as? String ?? "",
            title: dict["title"] as? String ?? "",
            order: dict["order"] as? Int ?? 0
        )
    }
}
