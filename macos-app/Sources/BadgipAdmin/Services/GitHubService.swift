import Foundation

enum GitHubServiceError: LocalizedError {
    case missingPAT
    case requestFailed(String)

    var errorDescription: String? {
        switch self {
        case .missingPAT:
            return "No GitHub personal access token saved. Add one in Deploy settings."
        case .requestFailed(let message):
            return message
        }
    }
}

final class GitHubService {
    static let owner = "pbadgi09"
    static let repo = "badgip-website"
    static let branch = "main"

    private var pat: String? {
        KeychainService.read(key: KeychainKey.githubPAT)
    }

    private func authorizedRequest(url: URL, method: String = "GET") throws -> URLRequest {
        guard let pat, !pat.isEmpty else { throw GitHubServiceError.missingPAT }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(pat)", forHTTPHeaderField: "Authorization")
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        request.setValue("2022-11-28", forHTTPHeaderField: "X-GitHub-Api-Version")
        return request
    }

    /// Commits a file to the repo at `path` (e.g. "assets/projects/my-app/cover.jpg").
    /// Fetches the existing file's sha first so this works for both create and update.
    func uploadFile(path: String, data: Data, commitMessage: String) async throws {
        // `path` is built from a user-picked filename (ImagePathBuilder), which
        // routinely contains spaces or other characters that aren't valid in a
        // raw URL — encode each segment or URL(string:) can return nil and the
        // force-unwrap below would crash the app on an otherwise ordinary
        // upload (e.g. "My Photo.png").
        let encodedPath = path
            .split(separator: "/")
            .map { $0.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? String($0) }
            .joined(separator: "/")
        guard let contentsURL = URL(string: "https://api.github.com/repos/\(Self.owner)/\(Self.repo)/contents/\(encodedPath)") else {
            throw GitHubServiceError.requestFailed("Couldn't build a valid GitHub URL for path: \(path)")
        }

        // A 404 here (file doesn't exist yet, i.e. a new upload) isn't a thrown
        // Swift error — URLSession only throws for transport-level failures
        // (no connection, timeout, etc.), which are swallowed below since a
        // genuine problem (bad PAT, no network) will surface from the PUT
        // request either way, with a clearer error message.
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
            throw GitHubServiceError.requestFailed("GitHub upload failed: \(message)")
        }
    }

    func triggerWorkflowDispatch(workflow: String = "deploy.yml", ref: String = "main") async throws {
        let url = URL(string: "https://api.github.com/repos/\(Self.owner)/\(Self.repo)/actions/workflows/\(workflow)/dispatches")!
        var request = try authorizedRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["ref": ref])

        let (responseData, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let message = String(data: responseData, encoding: .utf8) ?? "Unknown error"
            throw GitHubServiceError.requestFailed("Workflow dispatch failed: \(message)")
        }
    }
}
