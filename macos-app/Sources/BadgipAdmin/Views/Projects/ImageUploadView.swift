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
            HStack {
                Text("Cover: \(project.coverImage.isEmpty ? "none" : project.coverImage)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Button("Set Cover Image") { pickerTarget = .cover }
                    .disabled(isUploading)
            }

            HStack {
                Text("Gallery: \(project.gallery.count) image(s)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Button("Add Gallery Image") { pickerTarget = .gallery }
                    .disabled(isUploading)
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
            let path = ImagePathBuilder.projectImagePath(slug: slug, filename: filename)

            try await githubService.uploadFile(
                path: path,
                data: data,
                commitMessage: "Add image for project \(slug): \(filename)"
            )
            await JsDelivrService.purge(path: path)

            switch target {
            case .cover:
                project.coverImage = path
            case .gallery:
                project.gallery.append(path)
            }
        } catch {
            uploadError = error.localizedDescription
        }
    }
}
