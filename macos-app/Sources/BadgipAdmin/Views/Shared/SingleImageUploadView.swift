import SwiftUI
import UniformTypeIdentifiers

/// Upload control for a single, standalone image path (not a cover+gallery
/// pair like ImageUploadView) — used for the contact background photo and
/// the hero profile picture.
struct SingleImageUploadView: View {
    @Binding var path: String
    var buttonLabel: String = "Set Photo"
    var thumbnailWidth: CGFloat = 64
    var thumbnailHeight: CGFloat = 80
    var thumbnailCornerRadius: CGFloat = 8
    var repoPath: (String) -> String
    var storedPath: (String) -> String
    var commitMessage: (String) -> String

    @State private var isUploading = false
    @State private var uploadError: String?
    @State private var isPicking = false

    private let githubService = GitHubService()

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            thumbnail
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Button {
                        isPicking = true
                    } label: {
                        if isUploading {
                            HStack { ProgressView().controlSize(.small); Text("Uploading…") }
                        } else {
                            Text(buttonLabel)
                        }
                    }
                    .buttonStyle(.badgipSecondary)
                    .controlSize(.small)
                    .disabled(isUploading)

                    if !path.isEmpty {
                        Button("Clear") { path = "" }
                            .buttonStyle(.badgipSecondary)
                            .controlSize(.small)
                            .disabled(isUploading)
                    }
                }
                if let uploadError {
                    Text(uploadError).font(.caption2).foregroundStyle(.red)
                }
            }
        }
        .fileImporter(isPresented: $isPicking, allowedContentTypes: [.image]) { result in
            handlePicked(result)
        }
    }

    @ViewBuilder
    private var thumbnail: some View {
        Group {
            if path.isEmpty {
                RoundedRectangle(cornerRadius: thumbnailCornerRadius)
                    .fill(Color.badgipSurfaceHover)
                    .overlay(Image(systemName: "photo").foregroundStyle(.secondary))
            } else if let url = JsDelivrService.composeURL(forStoredPath: path) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    case .failure:
                        RoundedRectangle(cornerRadius: thumbnailCornerRadius)
                            .fill(Color.badgipSurfaceHover)
                            .overlay(Image(systemName: "exclamationmark.triangle").foregroundStyle(.secondary))
                    default:
                        ProgressView().controlSize(.small)
                    }
                }
            }
        }
        .frame(width: thumbnailWidth, height: thumbnailHeight)
        .clipShape(RoundedRectangle(cornerRadius: thumbnailCornerRadius))
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
            let data = try Data(contentsOf: url)
            let filename = url.lastPathComponent
            let repo = repoPath(filename)
            let stored = storedPath(filename)

            try await githubService.uploadFile(path: repo, data: data, commitMessage: commitMessage(filename))
            await JsDelivrService.purge(repoPath: repo)
            path = stored
        } catch {
            uploadError = error.localizedDescription
        }
    }
}
