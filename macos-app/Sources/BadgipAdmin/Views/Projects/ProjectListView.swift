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
                Text("No projects yet.")
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(projects) { project in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(project.title).font(.headline)
                                Text(project.status == "published" ? "Published" : "Draft")
                                    .font(.caption)
                                    .foregroundStyle(project.status == "published" ? .green : .secondary)
                            }
                            Spacer()
                            Button("Edit") { editingProject = project }
                            Button(role: .destructive) {
                                pendingDelete = project
                            } label: {
                                Image(systemName: "trash")
                            }
                        }
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
