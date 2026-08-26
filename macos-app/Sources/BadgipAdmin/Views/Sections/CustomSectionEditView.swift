import SwiftUI
import UniformTypeIdentifiers

struct CustomSectionEditView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @Environment(\.dismiss) private var dismiss

    @State var section: PageSection
    var onSave: (PageSection) -> Void

    @State private var original: PageSection
    @State private var isSaving = false
    @State private var errorMessage: String?
    // This sheet only persists on Save (Cancel discards everything) — so
    // removing an item must NOT delete its icon file right away, or
    // cancelling out of the sheet would leave RTDB (still holding the
    // original, unsaved section) pointing at a now-deleted file.
    @State private var pendingIconDeletions: [String] = []

    init(section: PageSection, onSave: @escaping (PageSection) -> Void) {
        _section = State(initialValue: section)
        _original = State(initialValue: section)
        self.onSave = onSave
    }

    private var hasChanges: Bool { section != original }

    var body: some View {
        EditorSheet(
            title: section.id.isEmpty ? "New Custom Section" : "Edit Section",
            isSaving: isSaving,
            canSave: !section.title.isEmpty && hasChanges,
            hasChanges: hasChanges,
            onCancel: { dismiss() },
            onSave: { Task { await save() } }
        ) {
            EditorCard(title: "Section") {
                LabeledField(label: "Title (e.g. \"Software & Language Proficiency\")", text: $section.title)
                Picker("Show in", selection: $section.mode) {
                    Text("Professional").tag("professional")
                    Text("Personal").tag("personal")
                }
                .pickerStyle(.segmented)
                .frame(maxWidth: 260)
            }

            EditorCard(title: "Items — each shown as an icon with a label underneath") {
                itemsEditor
                Text("Icon: drop in a PNG/SVG, paste an image URL, or type an emoji. Square (1:1) works best — it scales to fit its tile automatically.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red).font(.caption)
            }
        }
    }

    @ViewBuilder
    private var itemsEditor: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Same nested-List sizing approach as the About tab's timeline
            // editor — this lives inside EditorSheet's own ScrollView, and
            // macOS 12 (this app's deployment target) has no .scrollDisabled
            // to suppress the List's own scroll region.
            List {
                ForEach($section.items) { $item in
                    SectionItemRow(
                        item: $item,
                        sectionTitle: section.title,
                        onDelete: {
                            section.items.removeAll { $0.id == item.id }
                            if RepoFileCleanup.isInternalImagePath(item.icon) {
                                pendingIconDeletions.append(item.icon)
                            }
                        },
                        onReplaceIcon: { oldPath in
                            pendingIconDeletions.append(oldPath)
                        }
                    )
                    .listRowInsets(EdgeInsets())
                }
                .onMove { source, destination in
                    section.items.move(fromOffsets: source, toOffset: destination)
                    for index in section.items.indices { section.items[index].order = index }
                }
            }
            .listStyle(.plain)
            .frame(height: CGFloat(section.items.count) * 68 + 8)

            Button {
                section.items.append(SectionItem(order: section.items.count))
            } label: {
                Label("Add Item", systemImage: "plus")
            }
            .buttonStyle(.badgipSecondary)
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            section = try rtdb.savePageSection(section)
            original = section
            onSave(section)
            RepoFileCleanup.deleteStoredImages(pendingIconDeletions, commitMessage: "Remove icon for deleted section item")
            pendingIconDeletions = []
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}

private struct SectionItemRow: View {
    @Binding var item: SectionItem
    let sectionTitle: String
    let onDelete: () -> Void
    /// Reports the just-replaced icon path so the parent can queue it for
    /// deletion on Save rather than deleting it immediately — this sheet
    /// only persists on Save, so an immediate delete here would leave RTDB
    /// pointing at a deleted file if the user then hits Cancel.
    let onReplaceIcon: (String) -> Void

    private var slug: String {
        let lowered = sectionTitle.lowercased()
        let slugged = lowered.replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
        let trimmed = slugged.trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        return trimmed.isEmpty ? "section" : trimmed
    }

    var body: some View {
        HStack(alignment: .top) {
            IconPickerField(
                icon: $item.icon,
                repoPath: { ImagePathBuilder.sectionIconRepoPath(sectionId: slug, filename: $0) },
                storedPath: { ImagePathBuilder.sectionIconStoredPath(sectionId: slug, filename: $0) },
                commitMessage: { "Add section icon (\(slug)): \($0)" },
                onReplaced: onReplaceIcon
            )
            TextField("Label", text: $item.label).textFieldStyle(.badgip)
            Button(action: onDelete) {
                Image(systemName: "trash")
            }
            .buttonStyle(.badgipIcon(tint: .red))
            Image(systemName: "line.3.horizontal")
                .foregroundStyle(.tertiary)
                .padding(.top, 6)
        }
        .padding(10)
        .background(RoundedRectangle(cornerRadius: 8).fill(Color.badgipSurface))
    }
}
