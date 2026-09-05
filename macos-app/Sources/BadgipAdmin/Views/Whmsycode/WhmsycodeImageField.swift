import SwiftUI
import UniformTypeIdentifiers

/// Uploads an image straight to the whmsycode.com-website repo via the
/// Contents API (same no-local-git mechanism as badgip's own image
/// uploads), or lets the user reuse one already committed anywhere in the
/// repo. `repoPath`/`storedPath` are closures (not a fixed slug) so this one
/// field works for per-app images ("<slug>/img/<file>"), the homepage hero
/// ("assets/img/<file>"), and site-wide assets (favicon/OG) alike — mirrors
/// badgip's own `IconPickerField` taking path-builder closures for the same
/// reason. `storedPath` is always written as an absolute, root-relative path
/// (leading "/") so a picked/reused image resolves correctly regardless of
/// which page ends up using it.
struct WhmsycodeImageField: View {
    let label: String
    @Binding var storedPath: String
    let service: WhmsycodeGitHubService
    var maxDimension: CGFloat = 2000
    let repoPath: (String) -> String
    let storedPathBuilder: (String) -> String
    /// True only for fields whose target repo path is fixed regardless of
    /// filename (favicon, default OG image) — every page's <link>/<meta>
    /// tag points at one hardcoded path, not something content.js/site.json
    /// drives. For those, "Choose Existing" can't just point storedPath at
    /// the picked file's own location (nothing would ever look there); it
    /// has to copy the picked file's bytes into the fixed path instead. For
    /// every other field (the default), picking an existing image is a true
    /// reference — no bytes copied, storedPath just points at it directly.
    var copyContentInsteadOfReference: Bool = false
    /// Fires with the new stored path after a successful upload or pick —
    /// used by OG-image fields to also patch the page's static <meta
    /// property="og:image"> tag, which content.js never touches since
    /// crawlers don't run JS. Throwing so a failure here surfaces in this
    /// field's own error text instead of silently leaving the live page's
    /// social preview stale.
    var onUploaded: ((String) async throws -> Void)? = nil

    @State private var isUploading = false
    @State private var uploadError: String?
    @State private var isPickingFile = false
    @State private var isChoosingExisting = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            HStack {
                preview
                TextField("path", text: $storedPath).textFieldStyle(.badgip)
                if isUploading {
                    ProgressView().controlSize(.small)
                } else {
                    Menu {
                        Button("Upload New Image…") { isPickingFile = true }
                        Button("Choose Existing Image…") { isChoosingExisting = true }
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                    }
                    .menuStyle(.borderlessButton)
                    .frame(width: 20)
                }
            }
            if let uploadError {
                Text(uploadError).font(.caption2).foregroundStyle(.red)
            }
        }
        .fileImporter(isPresented: $isPickingFile, allowedContentTypes: [.image]) { result in
            handlePicked(result)
        }
        .sheet(isPresented: $isChoosingExisting) {
            WhmsycodeExistingImagePicker(service: service) { picked in
                Task { await usePicked(picked) }
            }
        }
    }

    @ViewBuilder
    private var preview: some View {
        Group {
            if storedPath.isEmpty {
                RoundedRectangle(cornerRadius: 6).fill(Color.badgipSurfaceHover)
            } else {
                AsyncImage(url: rawURL(for: storedPath)) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fit).padding(3)
                    case .failure:
                        Image(systemName: "exclamationmark.triangle").foregroundStyle(.secondary)
                    default:
                        ProgressView().controlSize(.small)
                    }
                }
            }
        }
        .frame(width: 32, height: 32)
        .background(RoundedRectangle(cornerRadius: 6).fill(Color.badgipSurfaceHover))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    private func rawURL(for path: String) -> URL? {
        let trimmed = path.hasPrefix("/") ? String(path.dropFirst()) : path
        return URL(string: "https://raw.githubusercontent.com/\(WhmsycodeGitHubService.owner)/\(WhmsycodeGitHubService.repo)/\(WhmsycodeGitHubService.branch)/\(trimmed)")
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

    private func usePicked(_ path: String) async {
        uploadError = nil
        do {
            let finalPath: String
            if copyContentInsteadOfReference {
                // path is absolute ("/foo/bar.png") — fetchFileData needs
                // the repo-relative form.
                let repoRelative = path.hasPrefix("/") ? String(path.dropFirst()) : path
                let bytes = try await service.fetchFileData(path: repoRelative)
                let filename = (path as NSString).lastPathComponent
                let target = repoPath(filename)
                try await service.uploadFile(path: target, data: bytes, commitMessage: "Update image: \(target)")
                finalPath = storedPathBuilder(filename)
            } else {
                finalPath = path
            }
            storedPath = finalPath
            if let onUploaded {
                try await onUploaded(finalPath)
            }
        } catch {
            uploadError = error.localizedDescription
        }
    }
}
