import SwiftUI
import UniformTypeIdentifiers

/// What a piece of media is attached to — enough information to clear just
/// that one reference (and re-save the owning record) when it's deleted,
/// without touching anything else that might reference the same file.
enum MediaOwner {
    case projectCover(projectId: String)
    case projectGalleryItem(projectId: String, path: String)
    case blogCover(postId: String)
    case blogImageSection(postId: String, sectionId: String)
    case sectionIcon(sectionId: String, itemId: String)
}

struct MediaReference: Identifiable {
    let id = UUID()
    var path: String
    var label: String
    var owner: MediaOwner
}

struct GalleryView: View {
    @EnvironmentObject private var rtdb: RTDBService
    private let github = GitHubService()

    @State private var projects: [Project] = []
    @State private var posts: [BlogPost] = []
    @State private var sections: [PageSection] = []
    @State private var references: [MediaReference] = []

    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var isAdding = false
    @State private var pendingDelete: MediaReference?

    private let columns = [GridItem(.adaptive(minimum: 160), spacing: 16)]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Gallery").font(.title.weight(.bold))
                Spacer()
                Button {
                    isAdding = true
                } label: {
                    Label("Add Media", systemImage: "plus")
                }
                .buttonStyle(.badgipPrimary)
            }
            .padding(24)

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red).font(.caption).padding(.horizontal, 24)
            }

            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if references.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "photo.on.rectangle.angled")
                        .font(.system(size: 40))
                        .foregroundStyle(.tertiary)
                    Text("No media referenced anywhere on the site yet.")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 16) {
                        ForEach(references) { ref in
                            MediaCard(reference: ref, onDelete: { pendingDelete = ref })
                        }
                    }
                    .padding(24)
                }
            }
        }
        .sheet(isPresented: $isAdding) {
            AddMediaView(projects: projects, posts: posts, sections: sections) { updated in
                apply(updated)
                isAdding = false
                references = buildReferences()
            }
        }
        .alert(
            "Remove this image from \"\(pendingDelete?.label ?? "")\"?",
            isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })
        ) {
            Button("Cancel", role: .cancel) { pendingDelete = nil }
            Button("Remove", role: .destructive) {
                if let ref = pendingDelete {
                    Task { await delete(ref) }
                }
                pendingDelete = nil
            }
        } message: {
            Text("This clears the reference and deletes the file from GitHub — the other places this file might be used are untouched.")
        }
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        do {
            async let p = rtdb.fetchProjects()
            async let b = rtdb.fetchBlogPosts()
            async let s = rtdb.fetchPageSections()
            projects = try await p
            posts = try await b
            sections = try await s
            references = buildReferences()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func isImagePath(_ value: String) -> Bool {
        let lowered = value.lowercased()
        if lowered.hasPrefix("http://") || lowered.hasPrefix("https://") { return true }
        return [".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"].contains { lowered.hasSuffix($0) }
    }

    private func buildReferences() -> [MediaReference] {
        var refs: [MediaReference] = []

        for project in projects {
            if !project.coverImage.isEmpty {
                refs.append(MediaReference(path: project.coverImage, label: "\(project.title) — Cover", owner: .projectCover(projectId: project.id)))
            }
            for path in project.gallery {
                refs.append(MediaReference(path: path, label: "\(project.title) — Gallery", owner: .projectGalleryItem(projectId: project.id, path: path)))
            }
        }

        for post in posts {
            let title = post.sections.first(where: { $0.type == "title" })?.value ?? "Untitled Post"
            if !post.coverImage.isEmpty {
                refs.append(MediaReference(path: post.coverImage, label: "\(title) — Cover", owner: .blogCover(postId: post.id)))
            }
            for section in post.sections where section.type == "image" && !section.value.isEmpty {
                refs.append(MediaReference(path: section.value, label: "\(title) — Image", owner: .blogImageSection(postId: post.id, sectionId: section.id)))
            }
        }

        for section in sections where section.kind == "custom" {
            for item in section.items where isImagePath(item.icon) {
                let itemLabel = item.label.isEmpty ? "Icon" : item.label
                refs.append(MediaReference(path: item.icon, label: "\(section.displayName) — \(itemLabel)", owner: .sectionIcon(sectionId: section.id, itemId: item.id)))
            }
        }

        return refs
    }

    private func delete(_ ref: MediaReference) async {
        switch ref.owner {
        case .projectCover(let projectId):
            if let i = projects.firstIndex(where: { $0.id == projectId }) {
                projects[i].coverImage = ""
                _ = try? rtdb.saveProject(projects[i])
            }
        case .projectGalleryItem(let projectId, let path):
            if let i = projects.firstIndex(where: { $0.id == projectId }) {
                projects[i].gallery.removeAll { $0 == path }
                _ = try? rtdb.saveProject(projects[i])
            }
        case .blogCover(let postId):
            if let i = posts.firstIndex(where: { $0.id == postId }) {
                posts[i].coverImage = ""
                _ = try? rtdb.saveBlogPost(posts[i])
            }
        case .blogImageSection(let postId, let sectionId):
            if let i = posts.firstIndex(where: { $0.id == postId }) {
                posts[i].sections.removeAll { $0.id == sectionId }
                _ = try? rtdb.saveBlogPost(posts[i])
            }
        case .sectionIcon(let sectionId, let itemId):
            if let i = sections.firstIndex(where: { $0.id == sectionId }) {
                if let j = sections[i].items.firstIndex(where: { $0.id == itemId }) {
                    sections[i].items[j].icon = ""
                }
                _ = try? rtdb.savePageSection(sections[i])
            }
        }
        references.removeAll { $0.id == ref.id }
        await deleteFromGitHub(ref)
    }

    /// Also removes the committed file from GitHub (not just the RTDB
    /// reference), so a deleted image doesn't keep sitting in the repo
    /// forever. Skipped for references that aren't our own repo files (an
    /// externally-hosted http(s) URL pasted into a field) since there's
    /// nothing on GitHub to delete.
    private func deleteFromGitHub(_ ref: MediaReference) async {
        let lowered = ref.path.lowercased()
        guard !lowered.hasPrefix("http://"), !lowered.hasPrefix("https://") else { return }
        let repoPath = "assets/\(ref.path)"
        do {
            try await github.deleteFile(path: repoPath, commitMessage: "Remove \(ref.label)")
            await JsDelivrService.purge(repoPath: repoPath)
        } catch {
            errorMessage = "Removed from the site, but couldn't delete the file from GitHub: \(error.localizedDescription)"
        }
    }

    /// Merges an AddMediaView result back into local state (it already wrote
    /// to RTDB itself — this just keeps this screen's in-memory copy in sync
    /// so a follow-up delete in the same session targets the right record).
    private func apply(_ result: AddMediaResult) {
        switch result {
        case .project(let updated):
            if let i = projects.firstIndex(where: { $0.id == updated.id }) { projects[i] = updated }
        case .blog(let updated):
            if let i = posts.firstIndex(where: { $0.id == updated.id }) { posts[i] = updated }
        case .section(let updated):
            if let i = sections.firstIndex(where: { $0.id == updated.id }) { sections[i] = updated }
        }
    }
}

private struct MediaCard: View {
    let reference: MediaReference
    let onDelete: () -> Void
    @State private var isHovering = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack(alignment: .topTrailing) {
                AsyncImage(url: resolvedURL) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    case .failure:
                        Rectangle().fill(Color.gray.opacity(0.12))
                            .overlay(Image(systemName: "exclamationmark.triangle").foregroundStyle(.secondary))
                    default:
                        Rectangle().fill(Color.gray.opacity(0.08))
                            .overlay(ProgressView().controlSize(.small))
                    }
                }
                .frame(height: 120)
                .clipShape(RoundedRectangle(cornerRadius: 10))

                if isHovering {
                    Button(action: onDelete) {
                        Image(systemName: "trash.circle.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(.white, .red)
                    }
                    .buttonStyle(.plain)
                    .padding(6)
                }
            }
            Text(reference.label)
                .font(.caption.weight(.medium))
                .lineLimit(2)
        }
        .onHover { isHovering = $0 }
    }

    private var resolvedURL: URL? {
        if reference.path.lowercased().hasPrefix("http://") || reference.path.lowercased().hasPrefix("https://") {
            return URL(string: reference.path)
        }
        return JsDelivrService.composeURL(forStoredPath: reference.path)
    }
}
