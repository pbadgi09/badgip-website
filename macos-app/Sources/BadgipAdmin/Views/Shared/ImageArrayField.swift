import SwiftUI
import UniformTypeIdentifiers

/// Editor for an ordered list of image paths (e.g. a mosaic carousel tile's
/// images). Thumbnails with per-item remove, plus an "Add" menu that either
/// uploads a new file or picks an already-committed one. Modeled on
/// SingleImageUploadView's upload pipeline (compress → commit → purge).
/// Like the other deliberate-Save editors it never deletes files itself —
/// removed internal paths are reported via `onImageRemoved` for the caller
/// to queue until its own Save commits.
struct ImageArrayField: View {
    @Binding var paths: [String]
    /// Builds the repo-relative upload path for a picked filename.
    var repoPath: (String) -> String
    /// Builds the assets-relative stored path saved into the model.
    var storedPath: (String) -> String
    var commitMessage: (String) -> String
    var onImageRemoved: (String) -> Void = { _ in }

    @State private var isUploading = false
    @State private var uploadError: String?
    @State private var isPicking = false
    @State private var isChoosingExisting = false

    private let githubService = GitHubService()

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if !paths.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(paths, id: \.self) { path in
                            thumbnail(for: path)
                                .overlay(alignment: .topTrailing) {
                                    Button {
                                        paths.removeAll { $0 == path }
                                        if RepoFileCleanup.isInternalPath(path) { onImageRemoved(path) }
                                    } label: {
                                        Image(systemName: "xmark.circle.fill")
                                            .foregroundStyle(.white, .black.opacity(0.6))
                                    }
                                    .buttonStyle(.plain)
                                    .padding(2)
                                }
                        }
                    }
                }
            }

            HStack {
                if isUploading {
                    HStack { ProgressView().controlSize(.small); Text("Uploading…") }
                } else {
                    Menu("Add Image") {
                        Button("Upload New Image…") { isPicking = true }
                        Button("Choose Existing Image…") { isChoosingExisting = true }
                    }
                    .buttonStyle(.badgipSecondary)
                    .controlSize(.small)
                    .fixedSize()
                }
                if let uploadError {
                    Text(uploadError).font(.caption2).foregroundStyle(.red)
                }
            }
        }
        .fileImporter(isPresented: $isPicking, allowedContentTypes: [.image]) { result in
            if case .success(let url) = result { Task { await upload(from: url) } }
            if case .failure(let error) = result { uploadError = error.localizedDescription }
        }
        .sheet(isPresented: $isChoosingExisting) {
            ExistingImagePicker(onPick: { picked in
                if !paths.contains(picked) { paths.append(picked) }
            })
        }
    }

    @ViewBuilder
    private func thumbnail(for path: String) -> some View {
        Group {
            if let url = JsDelivrService.composeURL(forStoredPath: path) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image): image.resizable().aspectRatio(contentMode: .fill)
                    case .failure:
                        RoundedRectangle(cornerRadius: 6).fill(Color.badgipSurfaceHover)
                            .overlay(Image(systemName: "exclamationmark.triangle").foregroundStyle(.secondary))
                    default: ProgressView().controlSize(.small)
                    }
                }
            } else {
                RoundedRectangle(cornerRadius: 6).fill(Color.badgipSurfaceHover)
            }
        }
        .frame(width: 64, height: 64)
        .clipShape(RoundedRectangle(cornerRadius: 6))
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
            let data = ImageCompressor.compress(rawData)
            let filename = url.lastPathComponent
            let repo = repoPath(filename)
            let stored = storedPath(filename)
            try await githubService.uploadFile(path: repo, data: data, commitMessage: commitMessage(filename))
            await JsDelivrService.purge(repoPath: repo)
            if !paths.contains(stored) { paths.append(stored) }
        } catch {
            uploadError = error.localizedDescription
        }
    }
}
