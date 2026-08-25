import Foundation

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
