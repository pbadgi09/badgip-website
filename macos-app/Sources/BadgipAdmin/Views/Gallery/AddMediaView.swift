import SwiftUI
import UniformTypeIdentifiers

enum AddMediaResult {
    case project(Project)
    case blog(BlogPost)
    case section(PageSection)
}

enum MediaDestination: String, CaseIterable, Identifiable {
    case projectCover = "Project Cover"
    case projectGallery = "Project Gallery"
    case blogCover = "Blog Cover"
    case blogImage = "Blog Image"
    case sectionIcon = "Section Icon (new item)"
    var id: String { rawValue }
}

struct AddMediaView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @Environment(\.dismiss) private var dismiss

    let projects: [Project]
    let posts: [BlogPost]
    let sections: [PageSection]
    var onDone: (AddMediaResult) -> Void

    @State private var destination: MediaDestination = .projectCover
    @State private var selectedProjectId: String = ""
    @State private var selectedPostId: String = ""
    @State private var selectedSectionId: String = ""
    @State private var newItemLabel: String = ""

    @State private var isPicking = false
    @State private var isUploading = false
    @State private var errorMessage: String?

    private let githubService = GitHubService()

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Add Media").font(.title2.weight(.bold))
                Spacer()
                Button("Cancel") { dismiss() }.buttonStyle(.badgipSecondary)
            }
            .padding(20)
            Divider()

            Form {
                Section("Attach to") {
                    Picker("Type", selection: $destination) {
                        ForEach(MediaDestination.allCases) { Text($0.rawValue).tag($0) }
                    }
                    destinationPicker
                }

                if destination == .sectionIcon {
                    Section("Item") {
                        TextField("Label (optional)", text: $newItemLabel)
                    }
                }

                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red).font(.caption)
                }

                Button {
                    isPicking = true
                } label: {
                    if isUploading {
                        HStack { ProgressView().controlSize(.small); Text("Uploading…") }
                    } else {
                        Label("Choose Image & Upload", systemImage: "square.and.arrow.up")
                    }
                }
                .buttonStyle(.badgipPrimary)
                .disabled(isUploading || !hasValidTarget)
            }
            .padding(.top, 4)
        }
        .frame(minWidth: 480, minHeight: 360)
        .fileImporter(isPresented: $isPicking, allowedContentTypes: [.image]) { result in
            handlePicked(result)
        }
    }

    private var hasValidTarget: Bool {
        switch destination {
        case .projectCover, .projectGallery: return !selectedProjectId.isEmpty
        case .blogCover, .blogImage: return !selectedPostId.isEmpty
        case .sectionIcon: return !selectedSectionId.isEmpty
        }
    }

    @ViewBuilder
    private var destinationPicker: some View {
        switch destination {
        case .projectCover, .projectGallery:
            Picker("Project", selection: $selectedProjectId) {
                Text("Choose…").tag("")
                ForEach(projects) { project in
                    Text(project.title).tag(project.id)
                }
            }
        case .blogCover, .blogImage:
            Picker("Post", selection: $selectedPostId) {
                Text("Choose…").tag("")
                ForEach(posts) { post in
                    Text(post.sections.first(where: { $0.type == "title" })?.value ?? "Untitled").tag(post.id)
                }
            }
        case .sectionIcon:
            Picker("Section", selection: $selectedSectionId) {
                Text("Choose…").tag("")
                ForEach(sections.filter { $0.kind == "custom" }) { section in
                    Text(section.displayName).tag(section.id)
                }
            }
        }
    }

    private func handlePicked(_ result: Result<URL, Error>) {
        switch result {
        case .failure(let error):
            errorMessage = error.localizedDescription
        case .success(let url):
            Task { await upload(from: url) }
        }
    }

    private func upload(from url: URL) async {
        isUploading = true
        errorMessage = nil
        defer { isUploading = false }

        guard url.startAccessingSecurityScopedResource() else {
            errorMessage = "Couldn't access the selected file."
            return
        }
        defer { url.stopAccessingSecurityScopedResource() }

        do {
            let data = try Data(contentsOf: url)
            let filename = url.lastPathComponent

            switch destination {
            case .projectCover, .projectGallery:
                guard var project = projects.first(where: { $0.id == selectedProjectId }) else { return }
                let slug = project.slug.isEmpty ? "untitled" : project.slug
                let repoPath = ImagePathBuilder.repoPath(slug: slug, filename: filename)
                let storedPath = ImagePathBuilder.storedPath(slug: slug, filename: filename)
                try await githubService.uploadFile(path: repoPath, data: data, commitMessage: "Add image for \(slug): \(filename)")
                await JsDelivrService.purge(repoPath: repoPath)
                if destination == .projectCover {
                    project.coverImage = storedPath
                } else {
                    project.gallery.append(storedPath)
                }
                let saved = try rtdb.saveProject(project)
                onDone(.project(saved))
                dismiss()

            case .blogCover, .blogImage:
                guard var post = posts.first(where: { $0.id == selectedPostId }) else { return }
                let slug = post.slug.isEmpty ? "untitled" : post.slug
                let repoPath = ImagePathBuilder.blogImageRepoPath(slug: slug, filename: filename)
                let storedPath = ImagePathBuilder.blogImageStoredPath(slug: slug, filename: filename)
                try await githubService.uploadFile(path: repoPath, data: data, commitMessage: "Add blog image for \(slug): \(filename)")
                await JsDelivrService.purge(repoPath: repoPath)
                if destination == .blogCover {
                    post.coverImage = storedPath
                } else {
                    post.sections.append(BlogSection(type: "image", value: storedPath))
                }
                let saved = try rtdb.saveBlogPost(post)
                onDone(.blog(saved))
                dismiss()

            case .sectionIcon:
                guard var section = sections.first(where: { $0.id == selectedSectionId }) else { return }
                let lowered = section.title.isEmpty ? "section" : section.title.lowercased()
                let slugged = lowered.replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
                let slug = slugged.trimmingCharacters(in: CharacterSet(charactersIn: "-"))
                let repoPath = ImagePathBuilder.sectionIconRepoPath(sectionId: slug.isEmpty ? "section" : slug, filename: filename)
                let storedPath = ImagePathBuilder.sectionIconStoredPath(sectionId: slug.isEmpty ? "section" : slug, filename: filename)
                try await githubService.uploadFile(path: repoPath, data: data, commitMessage: "Add section icon (\(slug)): \(filename)")
                await JsDelivrService.purge(repoPath: repoPath)
                section.items.append(SectionItem(icon: storedPath, label: newItemLabel, order: section.items.count))
                let saved = try rtdb.savePageSection(section)
                onDone(.section(saved))
                dismiss()
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
