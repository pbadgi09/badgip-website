import Foundation

/// One entry from GitHub's Git Trees API (`GET .../git/trees/{branch}?recursive=1`).
/// `path` is repo-root-relative with no leading slash (e.g. "assets/img/x.png").
struct WhmsycodeTreeEntry: Decodable {
    let path: String
    let type: String // "blob" (file) or "tree" (directory)
    let size: Int?

    private static let imageExtensions: Set<String> = ["png", "jpg", "jpeg", "gif", "svg", "webp"]

    var isImage: Bool {
        guard type == "blob" else { return false }
        let ext = (path as NSString).pathExtension.lowercased()
        return Self.imageExtensions.contains(ext)
    }
}
