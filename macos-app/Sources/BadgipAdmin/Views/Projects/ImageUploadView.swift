import SwiftUI
import UniformTypeIdentifiers

struct ImageUploadView: View {
    @Binding var project: Project
    /// This view is always embedded in ProjectEditView's sheet, which only
    /// persists on Save (Cancel discards) — so a replaced/removed image's
    /// old file must not be deleted here immediately, or discarding the
    /// edit would leave RTDB pointing at an already-deleted file. Reports
    /// the old path for the parent to queue until its own save() commits.
    var onImageRemoved: (String) -> Void = { _ in }

    @State private var isUploading = false
    @State private var uploadError: String?
    @State private var pickerTarget: PickerTarget?
    @State private var existingPickerTarget: PickerTarget?

    private enum PickerTarget {
        case cover
        case gallery
    }

    private let githubService = GitHubService()

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                thumbnail(for: project.coverImage, size: 64)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Cover image").font(.caption).foregroundStyle(.secondary)
                    HStack {
                        Menu("Set Cover Image") {
                            Button("Upload New Image…") { pickerTarget = .cover }
                            Button("Choose Existing Image…") { existingPickerTarget = .cover }
                        }
                        .buttonStyle(.badgipSecondary)
                        .controlSize(.small)
                        .fixedSize()
                        .disabled(isUploading)
                        if !project.coverImage.isEmpty {
                            Button("Clear") {
                                let old = project.coverImage
                                project.coverImage = ""
                                if RepoFileCleanup.isInternalPath(old) { onImageRemoved(old) }
                            }
                            .buttonStyle(.badgipSecondary)
                            .controlSize(.small)
                            .disabled(isUploading)
                        }
                    }
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Gallery (\(project.gallery.count))").font(.caption).foregroundStyle(.secondary)
                ScrollView(.horizontal) {
                    HStack(spacing: 8) {
                        ForEach(project.gallery, id: \.self) { path in
                            thumbnail(for: path, size: 56)
                                .overlay(alignment: .topTrailing) {
                                    Button {
                                        project.gallery.removeAll { $0 == path }
                                        if RepoFileCleanup.isInternalPath(path) { onImageRemoved(path) }
                                    } label: {
                                        Image(systemName: "xmark.circle.fill")
                                            .foregroundStyle(.white, .black.opacity(0.6))
                                    }
                                    .buttonStyle(.plain)
                                    .offset(x: 4, y: -4)
                                }
                        }
                        Menu("Add Gallery Image") {
                            Button("Upload New Image…") { pickerTarget = .gallery }
                            Button("Choose Existing Image…") { existingPickerTarget = .gallery }
                        }
                        .buttonStyle(.badgipSecondary)
                        .controlSize(.small)
                        .fixedSize()
                        .disabled(isUploading)
                    }
                }
            }

            if isUploading {
                ProgressView("Uploading…").controlSize(.small)
            }
            if let uploadError {
                Text(uploadError).font(.caption).foregroundStyle(.red)
            }
        }
        .fileImporter(
            isPresented: Binding(get: { pickerTarget != nil }, set: { if !$0 { pickerTarget = nil } }),
            allowedContentTypes: [.image]
        ) { result in
            guard let target = pickerTarget else { return }
            pickerTarget = nil
            handlePicked(result: result, target: target)
        }
        .sheet(isPresented: Binding(get: { existingPickerTarget != nil }, set: { if !$0 { existingPickerTarget = nil } })) {
            ExistingImagePicker(onPick: { picked in
                guard let target = existingPickerTarget else { return }
                existingPickerTarget = nil
                useExisting(picked, target: target)
            })
        }
    }

    /// Reusing an already-committed image — no upload, no compression, no
    /// network call at all, just point this field/slot at the same stored
    /// path.
    private func useExisting(_ picked: String, target: PickerTarget) {
        switch target {
        case .cover:
            guard picked != project.coverImage else { return }
            let previousCover = project.coverImage
            project.coverImage = picked
            if RepoFileCleanup.isInternalPath(previousCover) {
                onImageRemoved(previousCover)
            }
        case .gallery:
            guard !project.gallery.contains(picked) else { return }
            project.gallery.append(picked)
        }
    }

    @ViewBuilder
    private func thumbnail(for path: String, size: CGFloat) -> some View {
        Group {
            if path.isEmpty {
                RoundedRectangle(cornerRadius: 6)
                    .fill(Color.badgipSurfaceHover)
                    .overlay(Image(systemName: "photo").foregroundStyle(.secondary))
            } else if let url = JsDelivrService.composeURL(forStoredPath: path) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    case .failure:
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color.badgipSurfaceHover)
                            .overlay(Image(systemName: "exclamationmark.triangle").foregroundStyle(.secondary))
                    default:
                        ProgressView().controlSize(.small)
                    }
                }
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    private func handlePicked(result: Result<URL, Error>, target: PickerTarget) {
        switch result {
        case .failure(let error):
            uploadError = error.localizedDescription
        case .success(let url):
            Task { await upload(from: url, target: target) }
        }
    }

    private func upload(from url: URL, target: PickerTarget) async {
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
            let slug = project.slug.isEmpty ? "untitled" : project.slug
            let repoPath = ImagePathBuilder.repoPath(slug: slug, filename: filename)
            let storedPath = ImagePathBuilder.storedPath(slug: slug, filename: filename)
            let previousCover = project.coverImage

            try await githubService.uploadFile(
                path: repoPath,
                data: data,
                commitMessage: "Add image for project \(slug): \(filename)"
            )
            await JsDelivrService.purge(repoPath: repoPath)

            switch target {
            case .cover:
                project.coverImage = storedPath
                if previousCover != storedPath, RepoFileCleanup.isInternalPath(previousCover) {
                    onImageRemoved(previousCover)
                }
            case .gallery:
                project.gallery.append(storedPath)
            }
        } catch {
            uploadError = error.localizedDescription
        }
    }
}
