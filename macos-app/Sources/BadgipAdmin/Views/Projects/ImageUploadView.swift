import SwiftUI
import UniformTypeIdentifiers

struct ImageUploadView: View {
    @Binding var project: Project

    @State private var isUploading = false
    @State private var uploadError: String?
    @State private var pickerTarget: PickerTarget?

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
                        Button("Set Cover Image") { pickerTarget = .cover }
                            .buttonStyle(.badgipSecondary)
                            .controlSize(.small)
                            .disabled(isUploading)
                        if !project.coverImage.isEmpty {
                            Button("Clear") { project.coverImage = "" }
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
                                    } label: {
                                        Image(systemName: "xmark.circle.fill")
                                            .foregroundStyle(.white, .black.opacity(0.6))
                                    }
                                    .buttonStyle(.plain)
                                    .offset(x: 4, y: -4)
                                }
                        }
                        Button("Add Gallery Image") { pickerTarget = .gallery }
                            .buttonStyle(.badgipSecondary)
                            .controlSize(.small)
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
    }

    @ViewBuilder
    private func thumbnail(for path: String, size: CGFloat) -> some View {
        Group {
            if path.isEmpty {
                RoundedRectangle(cornerRadius: 6)
                    .fill(Color.gray.opacity(0.15))
                    .overlay(Image(systemName: "photo").foregroundStyle(.secondary))
            } else if let url = JsDelivrService.composeURL(forStoredPath: path) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    case .failure:
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color.gray.opacity(0.15))
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
            let data = try Data(contentsOf: url)
            let filename = url.lastPathComponent
            let slug = project.slug.isEmpty ? "untitled" : project.slug
            let repoPath = ImagePathBuilder.repoPath(slug: slug, filename: filename)
            let storedPath = ImagePathBuilder.storedPath(slug: slug, filename: filename)

            try await githubService.uploadFile(
                path: repoPath,
                data: data,
                commitMessage: "Add image for project \(slug): \(filename)"
            )
            await JsDelivrService.purge(repoPath: repoPath)

            switch target {
            case .cover:
                project.coverImage = storedPath
            case .gallery:
                project.gallery.append(storedPath)
            }
        } catch {
            uploadError = error.localizedDescription
        }
    }
}
