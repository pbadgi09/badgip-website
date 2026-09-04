import SwiftUI
import UniformTypeIdentifiers

/// Uploads an image straight to the whmsycode.com-website repo via the
/// Contents API (same no-local-git mechanism as badgip's own image
/// uploads). `repoPath`/`storedPath` are closures (not a fixed slug) so this
/// one field works for per-app images ("<slug>/img/<file>"), the homepage
/// hero ("assets/img/<file>"), and site-wide assets (favicon/OG) alike —
/// mirrors badgip's own `IconPickerField` taking path-builder closures for
/// the same reason.
struct WhmsycodeImageField: View {
    let label: String
    @Binding var storedPath: String
    let service: WhmsycodeGitHubService
    var maxDimension: CGFloat = 2000
    let repoPath: (String) -> String
    let storedPathBuilder: (String) -> String
    /// Fires with the new stored path after a successful upload — used by
    /// OG-image fields to also patch the page's static `<meta
    /// property="og:image">` tag, which content.js never touches since
    /// crawlers don't run JS. Throwing so a failure here (e.g. the meta tag
    /// patch) surfaces in this field's own error text instead of silently
    /// leaving the live page's social preview stale.
    var onUploaded: ((String) async throws -> Void)? = nil

    @State private var isUploading = false
    @State private var uploadError: String?
    @State private var isPickingFile = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            HStack {
                TextField("path", text: $storedPath).textFieldStyle(.badgip)
                if isUploading {
                    ProgressView().controlSize(.small)
                } else {
                    Button("Upload…") { isPickingFile = true }
                        .buttonStyle(.badgipSecondary)
                }
            }
            if let uploadError {
                Text(uploadError).font(.caption2).foregroundStyle(.red)
            }
        }
        .fileImporter(isPresented: $isPickingFile, allowedContentTypes: [.image]) { result in
            handlePicked(result)
        }
    }

    private func handlePicked(_ result: Result<URL, Error>) {
        switch result {
        case .failure(let error):
            uploadError = error.localizedDescription
        case .success(let url):
            Task { await upload(from: url) }
        }
    }

    private func upload(from url: URL) async {
        isUploading = true
        uploadError = nil
        defer { isUploading = false }

        guard url.startAccessingSecurityScopedResource() else {
            uploadError = "Couldn't access the selected file."
            return
        }
        defer { url.stopAccessingSecurityScopedResource() }

        do {
            let rawData = try Data(contentsOf: url)
            let data = ImageCompressor.compress(rawData, maxDimension: maxDimension)
            let filename = url.lastPathComponent
            let repo = repoPath(filename)
            let stored = storedPathBuilder(filename)
            try await service.uploadFile(path: repo, data: data, commitMessage: "Update image: \(repo)")
            storedPath = stored
            if let onUploaded {
                try await onUploaded(stored)
            }
        } catch {
            uploadError = error.localizedDescription
        }
    }
}
