import SwiftUI

struct ProjectListView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @State private var projects: [Project] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var editingProject: Project?
    @State private var pendingDelete: Project?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Projects").font(.title.weight(.bold))
                Spacer()
                Button {
                    editingProject = Project(id: "")
                } label: {
                    Label("New Project", systemImage: "plus")
                }
                .buttonStyle(.badgipPrimary)
            }
            .padding(24)

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red).font(.caption).padding(.horizontal, 24)
            }

            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if projects.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "folder.badge.plus")
                        .font(.system(size: 40))
                        .foregroundStyle(.tertiary)
                    Text("No projects yet — add your first one.")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(projects) { project in
                            ProjectRow(
                                project: project,
                                onEdit: { editingProject = project },
                                onDelete: { pendingDelete = project }
                            )
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)
                }
            }
        }
        .sheet(item: $editingProject) { project in
            ProjectEditView(project: project) { saved in
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
                if let project = pendingDelete {
                    rtdb.deleteProject(id: project.id)
                    projects.removeAll { $0.id == project.id }
                }
                pendingDelete = nil
            }
        } message: {
            Text("This removes it from the live site immediately and can't be undone.")
        }
        .task { await loadProjects() }
    }

    private func loadProjects() async {
        isLoading = true
        do {
            projects = try await rtdb.fetchProjects()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

private struct ProjectRow: View {
    let project: Project
    let onEdit: () -> Void
    let onDelete: () -> Void
    @State private var isHovering = false

    var body: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 6) {
                Text(project.title).font(.headline.weight(.semibold))
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
        let isPublished = project.status == "published"
        return Text(isPublished ? "Published" : "Draft")
            .font(.caption.weight(.medium))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(isPublished ? Color.badgipAccent.opacity(0.15) : Color.gray.opacity(0.15))
            .foregroundStyle(isPublished ? .badgipAccent : .secondary)
            .clipShape(Capsule())
    }
}
