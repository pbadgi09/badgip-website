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
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text(project.id.isEmpty ? "New Project" : "Edit Project")
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
                .disabled(isSaving || project.title.isEmpty || !hasChanges)
            }
            .padding(20)

            Divider()

            Form {
                Section("Basics") {
                    TextField("Title", text: $project.title)
                    TextField("Slug", text: $project.slug)
                    TextField("Summary", text: $project.summary)
                    TextField("Tags (comma separated)", text: $tagsText)
                        .onChange(of: tagsText) { newValue in
                            project.tags = newValue.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
                        }
                }

                Section("Description") {
                    TextEditor(text: $project.description).frame(minHeight: 120)
                }

                Section("Media") {
                    Text("Cover: 16:10 works best. Full-screen hero: 21:9 (a wide, short crop) works best.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    ImageUploadView(project: $project)
                    TextField("YouTube URL (optional)", text: $project.youtubeUrl)
                }

                Section("Look (optional — overrides the site default for this project's detail view)") {
                    OptionalColorField(label: "Accent color", hex: $project.accentColor, fallback: "#3effa3")
                    OptionalColorField(label: "Text color", hex: $project.textColor, fallback: "#0a0a0a")
                }

                Section("Links") {
                    TextField("Live URL", text: $project.liveUrl)
                    TextField("Repo URL", text: $project.repoUrl)
                }

                Section("Publishing") {
                    Picker("Status", selection: $project.status) {
                        Text("Draft").tag("draft")
                        Text("Published").tag("published")
                    }
                    Picker("Category", selection: $project.category) {
                        Text("Professional").tag("professional")
                        Text("Personal").tag("personal")
                    }
                    Toggle("Featured", isOn: $project.featured)
                    Stepper("Order: \(project.order)", value: $project.order, in: 0...999)
                }

                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red).font(.caption)
                }
            }
        }
        .frame(minWidth: 560, minHeight: 640)
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
