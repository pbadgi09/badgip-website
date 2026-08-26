import SwiftUI

struct BlogListView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @State private var posts: [BlogPost] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var editingPost: BlogPost?
    @State private var pendingDelete: BlogPost?
    @StateObject private var savedToast = SavedToastController()

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Blog").font(.title.weight(.bold))
                Spacer()
                Button {
                    editingPost = BlogPost(id: "", order: posts.count, sections: [BlogSection(type: "title", value: "")])
                } label: {
                    Label("New Post", systemImage: "plus")
                }
                .buttonStyle(.badgipPrimary)
            }
            .padding(24)

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red).font(.caption).padding(.horizontal, 24)
            }

            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if posts.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "doc.richtext")
                        .font(.system(size: 40))
                        .foregroundStyle(.tertiary)
                    Text("No posts yet — add your first one.")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                Text("Capped to the first 5 on the site — drag rows to reorder.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 8)
                List {
                    ForEach(posts) { post in
                        BlogRow(
                            post: post,
                            onEdit: { editingPost = post },
                            onDelete: { pendingDelete = post }
                        )
                    }
                    .onMove(perform: move)
                }
                .listStyle(.plain)
            }
        }
        .savedToast(savedToast)
        .sheet(item: $editingPost) { post in
            BlogEditView(post: post) { saved in
                if let index = posts.firstIndex(where: { $0.id == saved.id }) {
                    posts[index] = saved
                } else {
                    posts.append(saved)
                }
                editingPost = nil
            }
        }
        .alert(
            "Delete this post?",
            isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })
        ) {
            Button("Cancel", role: .cancel) { pendingDelete = nil }
            Button("Delete", role: .destructive) {
                if let post = pendingDelete {
                    rtdb.deleteBlogPost(id: post.id)
                    posts.removeAll { $0.id == post.id }
                    savedToast.flash()
                }
                pendingDelete = nil
            }
        } message: {
            Text("This removes it from the live site immediately and can't be undone.")
        }
        .task { await loadPosts() }
    }

    private func move(from source: IndexSet, to destination: Int) {
        posts.move(fromOffsets: source, toOffset: destination)
        for index in posts.indices { posts[index].order = index }
        rtdb.reorderBlogPosts(posts)
        savedToast.flash()
    }

    private func loadPosts() async {
        isLoading = true
        do {
            posts = try await rtdb.fetchBlogPosts()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

private struct BlogRow: View {
    let post: BlogPost
    let onEdit: () -> Void
    let onDelete: () -> Void
    @State private var isHovering = false

    private var titleText: String {
        post.sections.first(where: { $0.type == "title" })?.value ?? "Untitled"
    }

    var body: some View {
        HStack(spacing: 14) {
            Group {
                if let url = JsDelivrService.composeURL(forStoredPath: post.coverImage), !post.coverImage.isEmpty {
                    AsyncImage(url: url) { phase in
                        if let image = phase.image {
                            image.resizable().aspectRatio(contentMode: .fill)
                        } else {
                            Rectangle().fill(Color.badgipSurfaceHover)
                        }
                    }
                } else {
                    Rectangle().fill(Color.badgipSurfaceHover)
                        .overlay(Image(systemName: "doc.richtext").foregroundStyle(.tertiary))
                }
            }
            .frame(width: 64, height: 40)
            .clipShape(RoundedRectangle(cornerRadius: 6))

            VStack(alignment: .leading, spacing: 6) {
                Text(titleText).font(.headline.weight(.semibold))
                HStack(spacing: 8) {
                    statusBadge
                    Text("\(post.sections.count) section\(post.sections.count == 1 ? "" : "s")")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            Button("Edit", action: onEdit)
                .buttonStyle(.badgipSecondary)
            Button {
                onDelete()
            } label: {
                Image(systemName: "trash")
            }
            .buttonStyle(.badgipIcon(tint: .red))
            Image(systemName: "line.3.horizontal")
                .foregroundStyle(.tertiary)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(isHovering ? Color.badgipSurfaceHover : Color.badgipSurface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color.badgipBorder, lineWidth: 1)
        )
        .onHover { isHovering = $0 }
        .animation(.easeOut(duration: 0.15), value: isHovering)
    }

    private var statusBadge: some View {
        let isPublished = post.status == "published"
        return Text(isPublished ? "Published" : "Draft")
            .font(.caption.weight(.medium))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(isPublished ? Color.badgipAccent.opacity(0.15) : Color.gray.opacity(0.15))
            .foregroundStyle(isPublished ? .badgipAccent : .secondary)
            .clipShape(Capsule())
    }
}

private struct BlogEditView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @Environment(\.dismiss) private var dismiss

    @State var post: BlogPost
    var onSave: (BlogPost) -> Void

    @State private var original: BlogPost
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(post: BlogPost, onSave: @escaping (BlogPost) -> Void) {
        _post = State(initialValue: post)
        _original = State(initialValue: post)
        self.onSave = onSave
    }

    private var hasChanges: Bool { post != original }

    var body: some View {
        EditorSheet(
            title: post.id.isEmpty ? "New Post" : "Edit Post",
            isSaving: isSaving,
            canSave: hasChanges,
            onCancel: { dismiss() },
            onSave: { Task { await save() } }
        ) {
            EditorCard(title: "Basics") {
                LabeledField(label: "Slug", text: $post.slug)
                LabeledField(label: "Cover Image (URL or repo path)", text: $post.coverImage)
                Text("16:9 (a wide, short crop) works best — it becomes the hero image behind the title.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Picker("Status", selection: $post.status) {
                    Text("Draft").tag("draft")
                    Text("Published").tag("published")
                }
                Text("Drag rows on the Blog list to reorder.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            EditorCard(title: "Sections (rendered in this order)") {
                sectionsEditor
            }

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red).font(.caption)
            }
        }
        .onAppear {
            if post.publishedAt == 0 { post.publishedAt = Date().timeIntervalSince1970 * 1000 }
            original = post
        }
    }

    @ViewBuilder
    private var sectionsEditor: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach($post.sections) { $section in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: sectionIcon(section.type))
                            .foregroundStyle(Color.badgipAccent)
                            .frame(width: 18)
                        Picker("Type", selection: $section.type) {
                            Text("Title").tag("title")
                            Text("Subtitle").tag("subtitle")
                            Text("Text").tag("text")
                            Text("Image").tag("image")
                            Text("Code").tag("code")
                            Text("Map").tag("map")
                        }
                        .pickerStyle(.menu)
                        .labelsHidden()
                        .frame(width: 160)
                        Spacer()
                        Button {
                            post.sections.removeAll { $0.id == section.id }
                        } label: {
                            Image(systemName: "trash")
                        }
                        .buttonStyle(.badgipIcon(tint: .red))
                    }

                    // Standalone title/subtitle sections ARE the caption, so
                    // the optional per-section caption fields only make
                    // sense for the other content types.
                    if !["title", "subtitle"].contains(section.type) {
                        HStack {
                            LabeledField(label: "Caption title (optional)", text: $section.title)
                            LabeledField(label: "Caption subtitle (optional)", text: $section.subtitle)
                        }
                    }

                    if section.type == "text" {
                        LabeledField(label: "Text", text: $section.value, multiline: true)
                    } else if section.type == "image" {
                        LabeledField(label: "Image URL or repo path", text: $section.value)
                        Text("16:9 (a wide, short crop) works best here.")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    } else if section.type == "code" {
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Code").font(.caption).foregroundStyle(.secondary)
                            TextEditor(text: $section.value)
                                .font(.system(.body, design: .monospaced))
                                .frame(minHeight: 90)
                                .padding(6)
                                .background(RoundedRectangle(cornerRadius: 6).fill(Color.badgipSurface))
                                .overlay(RoundedRectangle(cornerRadius: 6).strokeBorder(Color.badgipBorder))
                        }
                    } else if section.type == "map" {
                        LabeledField(label: "Location (e.g. \"Cupertino, CA\")", text: $section.value)
                    } else {
                        LabeledField(label: section.type == "title" ? "Title" : "Subtitle", text: $section.value)
                    }

                    HStack {
                        OptionalColorField(label: "Accent", hex: $section.accentColor, fallback: "#000000")
                        OptionalColorField(label: "Text color", hex: $section.textColor, fallback: "#0a0a0a")
                    }
                }
                .padding(12)
                .background(RoundedRectangle(cornerRadius: 10).fill(Color.badgipSurface))
                .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Color.badgipBorder))
            }
            Button {
                post.sections.append(BlogSection(type: "text", value: ""))
            } label: {
                Label("Add Section", systemImage: "plus")
            }
            .buttonStyle(.badgipSecondary)
        }
    }

    private func sectionIcon(_ type: String) -> String {
        switch type {
        case "title": return "textformat.size.larger"
        case "subtitle": return "textformat.size.smaller"
        case "image": return "photo"
        case "code": return "chevron.left.forwardslash.chevron.right"
        case "map": return "map"
        default: return "text.alignleft"
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            post = try rtdb.saveBlogPost(post)
            original = post
            onSave(post)
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}
