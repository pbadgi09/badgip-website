import Foundation

enum WhmsycodeGitHubServiceError: LocalizedError {
    case missingPAT
    case requestFailed(String)

    var errorDescription: String? {
        switch self {
        case .missingPAT:
            return "No GitHub personal access token saved for whmsycode.com-website. Add one in the WHMSYCODE section."
        case .requestFailed(let message):
            return message
        }
    }
}

/// Mirrors GitHubService's Contents-API pattern (GET for sha, PUT base64
/// content, DELETE), but scoped to a second, separate repo. Kept as its own
/// standalone service rather than parameterizing GitHubService, so that
/// class's existing static owner/repo/branch constants — read directly by
/// every existing badgip-website image-upload path — stay untouched.
final class WhmsycodeGitHubService {
    static let owner = "pbadgi09"
    static let repo = "whmsycode.com-website"
    static let branch = "main"

    private var pat: String? {
        KeychainService.read(key: KeychainKey.whmsycodeGitHubPAT)
    }

    private func authorizedRequest(url: URL, method: String = "GET") throws -> URLRequest {
        guard let pat, !pat.isEmpty else { throw WhmsycodeGitHubServiceError.missingPAT }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(pat)", forHTTPHeaderField: "Authorization")
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        request.setValue("2022-11-28", forHTTPHeaderField: "X-GitHub-Api-Version")
        return request
    }

    private func contentsURL(for path: String) -> URL? {
        let encodedPath = path
            .split(separator: "/")
            .map { $0.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? String($0) }
            .joined(separator: "/")
        return URL(string: "https://api.github.com/repos/\(Self.owner)/\(Self.repo)/contents/\(encodedPath)")
    }

    /// Reads a text file's current content straight from the repo (main branch).
    func fetchFileContent(path: String) async throws -> String {
        guard let contentsURL = contentsURL(for: path) else {
            throw WhmsycodeGitHubServiceError.requestFailed("Couldn't build a valid GitHub URL for path: \(path)")
        }
        let (data, response) = try await URLSession.shared.data(for: authorizedRequest(url: contentsURL))
        guard let http = response as? HTTPURLResponse, http.statusCode == 200,
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let base64Content = (json["content"] as? String)?.replacingOccurrences(of: "\n", with: ""),
              let decoded = Data(base64Encoded: base64Content),
              let text = String(data: decoded, encoding: .utf8) else {
            let message = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw WhmsycodeGitHubServiceError.requestFailed("Couldn't fetch content for path \(path): \(message)")
        }
        return text
    }

    /// Commits a file to the repo at `path`. Fetches the existing file's sha
    /// first so this works for both create and update.
    func uploadFile(path: String, data: Data, commitMessage: String) async throws {
        guard let contentsURL = contentsURL(for: path) else {
            throw WhmsycodeGitHubServiceError.requestFailed("Couldn't build a valid GitHub URL for path: \(path)")
        }

        var existingSHA: String?
        if let (data, response) = try? await URLSession.shared.data(for: authorizedRequest(url: contentsURL, method: "GET")),
           let http = response as? HTTPURLResponse, http.statusCode == 200,
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            existingSHA = json["sha"] as? String
        }

        var putRequest = try authorizedRequest(url: contentsURL)
        putRequest.httpMethod = "PUT"
        putRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var body: [String: Any] = [
            "message": commitMessage,
            "content": data.base64EncodedString(),
            "branch": Self.branch,
        ]
        if let existingSHA {
            body["sha"] = existingSHA
        }
        putRequest.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (responseData, response) = try await URLSession.shared.data(for: putRequest)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let message = String(data: responseData, encoding: .utf8) ?? "Unknown error"
            throw WhmsycodeGitHubServiceError.requestFailed("GitHub upload failed: \(message)")
        }
    }

    /// Deletes a file at `path`. A 404 (already gone) is treated as success.
    func deleteFile(path: String, commitMessage: String) async throws {
        guard let contentsURL = contentsURL(for: path) else {
            throw WhmsycodeGitHubServiceError.requestFailed("Couldn't build a valid GitHub URL for path: \(path)")
        }

        let (getData, getResponse) = try await URLSession.shared.data(for: authorizedRequest(url: contentsURL, method: "GET"))
        guard let getHTTP = getResponse as? HTTPURLResponse else {
            throw WhmsycodeGitHubServiceError.requestFailed("No response fetching sha for path: \(path)")
        }
        if getHTTP.statusCode == 404 {
            return
        }
        guard getHTTP.statusCode == 200,
              let json = try? JSONSerialization.jsonObject(with: getData) as? [String: Any],
              let sha = json["sha"] as? String else {
            let message = String(data: getData, encoding: .utf8) ?? "Unknown error"
            throw WhmsycodeGitHubServiceError.requestFailed("Couldn't fetch sha for path \(path): \(message)")
        }

        var deleteRequest = try authorizedRequest(url: contentsURL, method: "DELETE")
        deleteRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "message": commitMessage,
            "sha": sha,
            "branch": Self.branch,
        ]
        deleteRequest.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (responseData, response) = try await URLSession.shared.data(for: deleteRequest)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let message = String(data: responseData, encoding: .utf8) ?? "Unknown error"
            throw WhmsycodeGitHubServiceError.requestFailed("GitHub delete failed: \(message)")
        }
    }

    // MARK: - Typed JSON convenience (apps/manifest.json, <slug>/content.json)

    func fetchManifest() async throws -> [WhmsycodeManifestEntry] {
        let text = try await fetchFileContent(path: "apps/manifest.json")
        guard let data = text.data(using: .utf8) else { return [] }
        return try JSONDecoder().decode([WhmsycodeManifestEntry].self, from: data)
    }

    func saveManifest(_ entries: [WhmsycodeManifestEntry], commitMessage: String) async throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted
        let data = try encoder.encode(entries)
        try await uploadFile(path: "apps/manifest.json", data: data, commitMessage: commitMessage)
    }

    func fetchAppContent(slug: String) async throws -> WhmsycodeAppContent {
        let text = try await fetchFileContent(path: "\(slug)/content.json")
        guard let data = text.data(using: .utf8) else {
            throw WhmsycodeGitHubServiceError.requestFailed("Empty content.json for \(slug)")
        }
        return try JSONDecoder().decode(WhmsycodeAppContent.self, from: data)
    }

    func saveAppContent(_ content: WhmsycodeAppContent, slug: String, commitMessage: String) async throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted
        let data = try encoder.encode(content)
        try await uploadFile(path: "\(slug)/content.json", data: data, commitMessage: commitMessage)
    }
}
