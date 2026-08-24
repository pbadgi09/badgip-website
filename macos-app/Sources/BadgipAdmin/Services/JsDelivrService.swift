import Foundation

enum JsDelivrService {
    static func purge(path: String) async {
        let url = URL(string: "https://purge.jsdelivr.net/gh/\(GitHubService.owner)/\(GitHubService.repo)@\(GitHubService.branch)/\(path)")!
        _ = try? await URLSession.shared.data(from: url)
    }

    static func composeURL(for path: String) -> URL? {
        URL(string: "https://cdn.jsdelivr.net/gh/\(GitHubService.owner)/\(GitHubService.repo)@\(GitHubService.branch)/\(path)")
    }
}
