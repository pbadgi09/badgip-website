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
                    SectionItemRow(item: $item, sectionTitle: section.title) {
                        section.items.removeAll { $0.id == item.id }
                        if RepoFileCleanup.isInternalImagePath(item.icon) {
                            pendingIconDeletions.append(item.icon)
                        }
                    }
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

    @State private var isUploading = false
    @State private var uploadError: String?
    @State private var isPickingFile = false

    private let githubService = GitHubService()

    private var slug: String {
        let lowered = sectionTitle.lowercased()
        let slugged = lowered.replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
        let trimmed = slugged.trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        return trimmed.isEmpty ? "section" : trimmed
    }

    private var isImagePath: Bool {
        let lowered = item.icon.lowercased()
        return lowered.hasPrefix("http://") || lowered.hasPrefix("https://")
            || [".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"].contains { lowered.hasSuffix($0) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                iconPreview
                TextField("Icon (emoji, URL, or upload →)", text: $item.icon)
                    .textFieldStyle(.badgip)
                Button {
                    isPickingFile = true
                } label: {
                    if isUploading {
                        ProgressView().controlSize(.small)
                    } else {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
                .buttonStyle(.badgipIcon)
                .disabled(isUploading)

                TextField("Label", text: $item.label).textFieldStyle(.badgip)
                Button(action: onDelete) {
                    Image(systemName: "trash")
                }
                .buttonStyle(.badgipIcon(tint: .red))
                Image(systemName: "line.3.horizontal")
                    .foregroundStyle(.tertiary)
            }
            if let uploadError {
                Text(uploadError).font(.caption2).foregroundStyle(.red)
            }
        }
        .padding(10)
        .background(RoundedRectangle(cornerRadius: 8).fill(Color.badgipSurface))
        .fileImporter(isPresented: $isPickingFile, allowedContentTypes: [.image]) { result in
            handlePicked(result)
        }
    }

    @ViewBuilder
    private var iconPreview: some View {
        Group {
            if item.icon.isEmpty {
                RoundedRectangle(cornerRadius: 6).fill(Color.badgipSurfaceHover)
            } else if isImagePath, let url = resolvedURL {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fit).padding(3)
                    case .failure:
                        Image(systemName: "exclamationmark.triangle").foregroundStyle(.secondary)
                    default:
                        ProgressView().controlSize(.small)
                    }
                }
            } else {
                Text(item.icon).font(.title3)
            }
        }
        .frame(width: 32, height: 32)
        .background(RoundedRectangle(cornerRadius: 6).fill(Color.badgipSurfaceHover))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    private var resolvedURL: URL? {
        if item.icon.lowercased().hasPrefix("http://") || item.icon.lowercased().hasPrefix("https://") {
            return URL(string: item.icon)
        }
        return JsDelivrService.composeURL(forStoredPath: item.icon)
    }

    private func handlePicked(_ result: Result<URL, Error>) {
        switch result {
        case .failure(let error):
            uploadError = error.localizedDescription
        case .success(let url):
            Task { await upload(from: url) }
        }
    }

    private func upload(from url: URL) async {
        isUploading = true
        uploadError = nil
        defer { isUploading = false }

        guard url.startAccessingSecurityScopedResource() else {
            uploadError = "Couldn't access the selected file."
            return
        }
        defer { url.stopAccessingSecurityScopedResource() }

        do {
            let data = try Data(contentsOf: url)
            let filename = url.lastPathComponent
            let repoPath = ImagePathBuilder.sectionIconRepoPath(sectionId: slug, filename: filename)
            let storedPath = ImagePathBuilder.sectionIconStoredPath(sectionId: slug, filename: filename)

            try await githubService.uploadFile(
                path: repoPath,
                data: data,
                commitMessage: "Add section icon (\(slug)): \(filename)"
            )
            await JsDelivrService.purge(repoPath: repoPath)
            item.icon = storedPath
        } catch {
            uploadError = error.localizedDescription
        }
    }
}
