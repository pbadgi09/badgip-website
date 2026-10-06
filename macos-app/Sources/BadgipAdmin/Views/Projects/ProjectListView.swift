import SwiftUI

struct ProjectListView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @State private var projects: [Project] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var editingProject: Project?
    @State private var pendingDelete: Project?
    @State private var searchText = ""
    @StateObject private var savedToast = SavedToastController()
    @StateObject private var undoToast = UndoToastController()

    private var isSearching: Bool { !searchText.trimmingCharacters(in: .whitespaces).isEmpty }

    private var filtered: [Project] {
        let q = searchText.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return projects }
        return projects.filter {
            $0.title.lowercased().contains(q) || $0.tags.contains { $0.lowercased().contains(q) }
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Projects").font(.title.weight(.bold))
                Spacer()
                if !projects.isEmpty {
                    TextField("Search", text: $searchText)
                        .textFieldStyle(.badgip)
                        .frame(width: 200)
                }
                Button {
                    editingProject = Project(id: "", order: projects.count)
                } label: {
                    Label("New Project", systemImage: "plus")
                }
                .buttonStyle(.badgipPrimary)
            }
            .padding(24)

            if let errorMessage {
                ErrorBanner(message: errorMessage, retry: { Task { await loadProjects() } })
                    .padding(.horizontal, 24)
                    .padding(.bottom, 8)
            }

            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if projects.isEmpty {
                emptyState(icon: "folder.badge.plus", text: "No projects yet — add your first one.")
            } else if filtered.isEmpty {
                emptyState(icon: "magnifyingglass", text: "No projects match \u{201c}\(searchText)\u{201d}.")
            } else {
                List {
                    let rows = ForEach(filtered) { project in
                        ProjectRow(
                            project: project,
                            onEdit: { editingProject = project },
                            onDuplicate: { duplicate(project) },
                            onTogglePublished: { setStatus(project, published: project.status != "published") },
                            onToggleFeatured: { setFeatured(project, !project.featured) },
                            onDelete: { pendingDelete = project }
                        )
                        .listRowInsets(EdgeInsets())
                    }
                    // Reorder only on the full, unfiltered list — reordering a
                    // filtered subset would renumber the wrong items.
                    if isSearching {
                        rows
                    } else {
                        rows.onMove(perform: move)
                    }
                }
                .listStyle(.plain)
            }
        }
        .savedToast(savedToast)
        .undoToast(undoToast)
        .sheet(item: $editingProject) { project in
            ProjectEditView(project: project, existingSlugs: slugsExcluding(project)) { saved in
                if let index = projects.firstIndex(where: { $0.id == saved.id }) {
                    projects[index] = saved
                } else {
                    projects.append(saved)
                }
                editingProject = nil
            }
        }
        .alert(
            "Delete \"\(pendingDelete?.title ?? "")\"?",
            isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })
        ) {
            Button("Cancel", role: .cancel) { pendingDelete = nil }
            Button("Delete", role: .destructive) {
                if let project = pendingDelete { delete(project) }
                pendingDelete = nil
            }
        } message: {
            Text("This removes it from the live site immediately. You'll have a few seconds to undo.")
        }
        .task { await loadProjects() }
    }

    @ViewBuilder
    private func emptyState(icon: String, text: String) -> some View {
        VStack(spacing: 10) {
            Image(systemName: icon).font(.system(size: 40)).foregroundStyle(.tertiary)
            Text(text).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func slugsExcluding(_ project: Project) -> Set<String> {
        Set(projects.filter { $0.id != project.id }.map(\.slug).filter { !$0.isEmpty })
    }

    private func move(from source: IndexSet, to destination: Int) {
        projects.move(fromOffsets: source, toOffset: destination)
        for index in projects.indices { projects[index].order = index }
        rtdb.reorderProjects(projects)
        savedToast.flash()
    }

    private func duplicate(_ project: Project) {
        var dup = project
        dup.id = ""
        dup.createdAt = 0
        dup.title = project.title + " (copy)"
        dup.status = "draft"
        dup.featured = false
        let base = (project.slug.isEmpty ? SlugUtil.normalize(project.title) : project.slug) + "-copy"
        dup.slug = SlugUtil.unique(base, existing: Set(projects.map(\.slug).filter { !$0.isEmpty }))
        do {
            let saved = try rtdb.saveProject(dup)
            projects.append(saved)
            savedToast.flash()
        } catch {
            errorMessage = FriendlyError.describe(error)
        }
    }

    private func setStatus(_ project: Project, published: Bool) {
        guard var p = projects.first(where: { $0.id == project.id }) else { return }
        p.status = published ? "published" : "draft"
        persistQuickChange(p)
    }

    private func setFeatured(_ project: Project, _ featured: Bool) {
        guard var p = projects.first(where: { $0.id == project.id }) else { return }
        p.featured = featured
        persistQuickChange(p)
    }

    private func persistQuickChange(_ project: Project) {
        do {
            let saved = try rtdb.saveProject(project)
            if let index = projects.firstIndex(where: { $0.id == saved.id }) { projects[index] = saved }
            savedToast.flash()
        } catch {
            errorMessage = FriendlyError.describe(error)
        }
    }

    private func delete(_ project: Project) {
        rtdb.deleteProject(id: project.id)
        projects.removeAll { $0.id == project.id }
        let cached = project
        undoToast.show(
            message: "Project deleted",
            onUndo: {
                if let restored = try? rtdb.saveProject(cached) {
                    projects.append(restored)
                    projects.sort { $0.order < $1.order }
                }
            },
            onCommit: {
                // Deferred until the undo window lapses — now safe because the
                // scanner sees all references (cover/gallery/tiles).
                RepoFileCleanup.deleteStoredImages(cached.allImagePaths, commitMessage: "Remove images for deleted project: \(cached.title)")
            }
        )
    }

    private func loadProjects() async {
        isLoading = true
        do {
            projects = try await rtdb.fetchProjects()
            errorMessage = nil
        } catch {
            errorMessage = FriendlyError.describe(error)
        }
        isLoading = false
    }
}

private struct ProjectRow: View {
    let project: Project
    let onEdit: () -> Void
    let onDuplicate: () -> Void
    let onTogglePublished: () -> Void
    let onToggleFeatured: () -> Void
    let onDelete: () -> Void
    @State private var isHovering = false

    private var isPublished: Bool { project.status == "published" }

    var body: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Text(project.title).font(.headline.weight(.semibold))
                    if project.featured {
                        Image(systemName: "star.fill").font(.caption2).foregroundStyle(.badgipAccent)
                    }
                }
                HStack(spacing: 8) {
                    statusBadge
                    if !project.tags.isEmpty {
                        Text(project.tags.prefix(3).joined(separator: " · "))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            Spacer()
            Button("Edit", action: onEdit).buttonStyle(.badgipSecondary)
            Menu {
                Button("Edit", action: onEdit)
                Button("Duplicate", action: onDuplicate)
                Button(isPublished ? "Move to Draft" : "Publish", action: onTogglePublished)
                Button(project.featured ? "Unfeature" : "Feature", action: onToggleFeatured)
                Divider()
                Button("Delete", role: .destructive, action: onDelete)
            } label: {
                Image(systemName: "ellipsis.circle")
            }
            .menuStyle(.borderlessButton)
            .frame(width: 22)
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 12).fill(isHovering ? Color.badgipSurfaceHover : Color.badgipSurface))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color.badgipBorder, lineWidth: 1))
        .onHover { isHovering = $0 }
        .animation(.easeOut(duration: 0.15), value: isHovering)
        .contextMenu {
            Button("Edit", action: onEdit)
            Button("Duplicate", action: onDuplicate)
            Button(isPublished ? "Move to Draft" : "Publish", action: onTogglePublished)
            Button(project.featured ? "Unfeature" : "Feature", action: onToggleFeatured)
            Divider()
            Button("Delete", role: .destructive, action: onDelete)
        }
    }

    private var statusBadge: some View {
        Text(isPublished ? "Published" : "Draft")
            .font(.caption.weight(.medium))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(isPublished ? Color.badgipAccent.opacity(0.15) : Color.gray.opacity(0.15))
            .foregroundStyle(isPublished ? .badgipAccent : .secondary)
            .clipShape(Capsule())
    }
}
