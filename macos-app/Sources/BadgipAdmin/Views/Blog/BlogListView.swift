import SwiftUI

struct BlogListView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @State private var posts: [BlogPost] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var editingPost: BlogPost?
    @State private var pendingDelete: BlogPost?

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
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(posts) { post in
                            BlogRow(
                                post: post,
                                onEdit: { editingPost = post },
                                onDelete: { pendingDelete = post }
                            )
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)
                }
            }
        }
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
                }
                pendingDelete = nil
            }
        } message: {
            Text("This removes it from the live site immediately and can't be undone.")
        }
        .task { await loadPosts() }
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
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.primary.opacity(isHovering ? 0.06 : 0.03))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
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

    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text(post.id.isEmpty ? "New Post" : "Edit Post")
                    .font(.title2.weight(.bold))
                Spacer()
                Button("Cancel") { dismiss() }
                    .buttonStyle(.badgipSecondary)
                Button {
                    Task { await save() }
                } label: {
                    if isSaving {
                        ProgressView().controlSize(.small).tint(.black)
                    } else {
                        Text("Save")
                    }
                }
                .buttonStyle(.badgipPrimary)
                .disabled(isSaving)
            }
            .padding(20)

            Divider()

            Form {
                Section("Basics") {
                    TextField("Slug", text: $post.slug)
                    TextField("Cover Image (URL or repo path)", text: $post.coverImage)
                    Picker("Status", selection: $post.status) {
                        Text("Draft").tag("draft")
                        Text("Published").tag("published")
                    }
                    Stepper("Order: \(post.order)", value: $post.order, in: 0...999)
                }

                Section("Sections (rendered in this order)") {
                    sectionsEditor
                }

                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red).font(.caption)
                }
            }
            .padding(.top, 4)
        }
        .frame(minWidth: 620, minHeight: 680)
        .onAppear {
            if post.publishedAt == 0 { post.publishedAt = Date().timeIntervalSince1970 * 1000 }
        }
    }

    @ViewBuilder
    private var sectionsEditor: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach($post.sections) { $section in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Picker("Type", selection: $section.type) {
                            Text("Title").tag("title")
                            Text("Subtitle").tag("subtitle")
                            Text("Text").tag("text")
                            Text("Image").tag("image")
                            Text("Map").tag("map")
                        }
                        .frame(width: 180)
                        Spacer()
                        Button {
                            post.sections.removeAll { $0.id == section.id }
                        } label: {
                            Image(systemName: "trash")
                        }
                        .buttonStyle(.badgipIcon(tint: .red))
                    }
                    if section.type == "text" {
                        TextEditor(text: $section.value).frame(minHeight: 70).textFieldStyle(.roundedBorder)
                    } else if section.type == "image" {
                        TextField("Image URL or repo path", text: $section.value).textFieldStyle(.roundedBorder)
                    } else if section.type == "map" {
                        TextField("Location (e.g. \"Cupertino, CA\")", text: $section.value).textFieldStyle(.roundedBorder)
                    } else {
                        TextField(section.type == "title" ? "Title" : "Subtitle", text: $section.value).textFieldStyle(.roundedBorder)
                    }
                }
                .padding(10)
                .background(RoundedRectangle(cornerRadius: 8).fill(Color.primary.opacity(0.03)))
            }
            Button {
                post.sections.append(BlogSection(type: "text", value: ""))
            } label: {
                Label("Add Section", systemImage: "plus")
            }
            .buttonStyle(.badgipSecondary)
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            post = try rtdb.saveBlogPost(post)
            onSave(post)
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}
