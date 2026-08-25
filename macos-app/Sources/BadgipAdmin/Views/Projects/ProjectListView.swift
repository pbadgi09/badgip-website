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
                Text("Projects").font(.title2.bold())
                Spacer()
                Button {
                    editingProject = Project(id: "")
                } label: {
                    Label("New Project", systemImage: "plus")
                }
            }
            .padding()

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red).font(.caption).padding(.horizontal)
            }

            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if projects.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "folder.badge.plus")
                        .font(.largeTitle)
                        .foregroundStyle(.tertiary)
                    Text("No projects yet — add your first one.")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(projects) { project in
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(project.title).font(.headline)
                                HStack(spacing: 6) {
                                    statusBadge(for: project.status)
                                    if !project.tags.isEmpty {
                                        Text(project.tags.prefix(3).joined(separator: " · "))
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                            Spacer()
                            Button("Edit") { editingProject = project }
                            Button(role: .destructive) {
                                pendingDelete = project
                            } label: {
                                Image(systemName: "trash")
                            }
                        }
                        .padding(.vertical, 4)
                    }
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

    @ViewBuilder
    private func statusBadge(for status: String) -> some View {
        let isPublished = status == "published"
        Text(isPublished ? "Published" : "Draft")
            .font(.caption.weight(.medium))
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(isPublished ? Color.green.opacity(0.15) : Color.gray.opacity(0.15))
            .foregroundStyle(isPublished ? .green : .secondary)
            .clipShape(Capsule())
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
