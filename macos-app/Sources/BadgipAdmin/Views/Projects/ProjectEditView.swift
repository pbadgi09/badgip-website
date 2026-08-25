import SwiftUI

struct ProjectEditView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @Environment(\.dismiss) private var dismiss

    @State var project: Project
    var onSave: (Project) -> Void

    @State private var original: Project
    @State private var tagsText: String = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(project: Project, onSave: @escaping (Project) -> Void) {
        _project = State(initialValue: project)
        _original = State(initialValue: project)
        self.onSave = onSave
    }

    private var hasChanges: Bool { project != original }

    var body: some View {
        EditorSheet(
            title: project.id.isEmpty ? "New Project" : "Edit Project",
            isSaving: isSaving,
            canSave: !project.title.isEmpty && hasChanges,
            onCancel: { dismiss() },
            onSave: { Task { await save() } }
        ) {
            EditorCard(title: "Basics") {
                LabeledField(label: "Title", text: $project.title)
                LabeledField(label: "Slug", text: $project.slug)
                LabeledField(label: "Summary", text: $project.summary)
                LabeledField(label: "Tags (comma separated)", text: $tagsText)
                    .onChange(of: tagsText) { newValue in
                        project.tags = newValue.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
                    }
            }

            EditorCard(title: "Description") {
                LabeledField(label: "Description", text: $project.description, multiline: true)
            }

            EditorCard(title: "Media") {
                Text("Cover: 16:10 works best. Full-screen hero: 21:9 (a wide, short crop) works best.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                ImageUploadView(project: $project)
                LabeledField(label: "YouTube URL (optional)", text: $project.youtubeUrl)
            }

            EditorCard(title: "Look (optional — overrides the site default for this project's detail view)") {
                OptionalColorField(label: "Accent color", hex: $project.accentColor, fallback: "#3effa3")
                OptionalColorField(label: "Text color", hex: $project.textColor, fallback: "#0a0a0a")
            }

            EditorCard(title: "Links") {
                LabeledField(label: "Live URL", text: $project.liveUrl)
                LabeledField(label: "Repo URL", text: $project.repoUrl)
            }

            EditorCard(title: "Publishing") {
                Picker("Status", selection: $project.status) {
                    Text("Draft").tag("draft")
                    Text("Published").tag("published")
                }
                Picker("Category", selection: $project.category) {
                    Text("Professional").tag("professional")
                    Text("Personal").tag("personal")
                }
                Toggle("Featured", isOn: $project.featured)
                Text("Featured projects fill the site's first 6 slots (2 rows) before the rest are hidden behind \"Show More.\"")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Stepper("Order: \(project.order)", value: $project.order, in: 0...999)
            }

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red).font(.caption)
            }
        }
        .onAppear { tagsText = project.tags.joined(separator: ", ") }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            project = try rtdb.saveProject(project)
            original = project
            onSave(project)
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}
