import SwiftUI

struct AboutEditorView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @State private var about = AboutContent()
    @State private var original = AboutContent()
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var statusMessage: String?
    @State private var savedBadgeVisible = false
    @State private var savedBadgeTask: Task<Void, Never>?

    private var hasChanges: Bool { about != original }
    // "Saved" only shows for 3s after a save, and only while nothing has
    // changed since — so it never lingers indefinitely, and a new edit
    // hides it immediately rather than falsely implying it's already saved.
    private var showSavedBadge: Bool { savedBadgeVisible && !hasChanges }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("About").font(.title.weight(.bold))
                Spacer()
                if showSavedBadge {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark.circle.fill").foregroundStyle(.badgipAccent)
                        Text("Saved").font(.caption).foregroundStyle(.secondary)
                    }
                } else if let statusMessage, statusMessage != "Saved" {
                    Text(statusMessage).font(.caption).foregroundStyle(.red)
                }
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
                .disabled(isSaving || !hasChanges)
            }
            .padding(24)

            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        EditorCard(title: "Professional Bio") {
                            TextEditor(text: $about.professionalBio)
                                .frame(minHeight: 90)
                        }
                        EditorCard(title: "Personal Bio") {
                            TextEditor(text: $about.personalBio)
                                .frame(minHeight: 90)
                        }
                        EditorCard(title: "Professional Timeline") {
                            timelineEditor(entries: $about.professionalTimeline)
                        }
                        EditorCard(title: "Personal Timeline") {
                            timelineEditor(entries: $about.personalTimeline)
                        }
                    }
                    .padding(24)
                }
            }
        }
        .task { await load() }
    }

    @ViewBuilder
    private func timelineEditor(entries: Binding<[TimelineEntry]>) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // A plain List (rather than the VStack/ForEach this used to be)
            // so rows get native drag-to-reorder via .onMove — but this view
            // already lives inside AboutEditorView's own outer ScrollView,
            // and macOS 12 (this app's deployment target) has no
            // .scrollDisabled to suppress the List's own scroll region, so
            // it's sized to fit its rows exactly instead of nesting two
            // independent scroll areas.
            List {
                ForEach(entries) { $entry in
                    timelineRow(entry: $entry, onDelete: {
                        entries.wrappedValue.removeAll { $0.id == entry.id }
                    })
                    .listRowInsets(EdgeInsets())
                }
                .onMove { source, destination in
                    entries.wrappedValue.move(fromOffsets: source, toOffset: destination)
                }
            }
            .listStyle(.plain)
            .frame(height: CGFloat(entries.wrappedValue.count) * 122 + 8)

            Button {
                entries.wrappedValue.append(TimelineEntry())
            } label: {
                Label("Add Entry", systemImage: "plus")
            }
            .buttonStyle(.badgipSecondary)
        }
    }

    @ViewBuilder
    private func timelineRow(entry: Binding<TimelineEntry>, onDelete: @escaping () -> Void) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 10) {
                SingleImageUploadView(
                    path: entry.logo,
                    buttonLabel: "Logo",
                    thumbnailWidth: 32,
                    thumbnailHeight: 32,
                    thumbnailCornerRadius: 4,
                    repoPath: { ImagePathBuilder.timelineLogoRepoPath(entryId: entry.wrappedValue.id, filename: $0) },
                    storedPath: { ImagePathBuilder.timelineLogoStoredPath(entryId: entry.wrappedValue.id, filename: $0) },
                    commitMessage: { "Set timeline logo: \($0)" }
                )
                TextField("Year", text: entry.year).frame(width: 70).textFieldStyle(.roundedBorder)
                TextField("End (optional)", text: entry.endYear).frame(width: 100).textFieldStyle(.roundedBorder)
                TextField("Title", text: entry.title).textFieldStyle(.roundedBorder)
                Button(action: onDelete) {
                    Image(systemName: "trash")
                }
                .buttonStyle(.badgipIcon(tint: .red))
                Image(systemName: "line.3.horizontal")
                    .foregroundStyle(.tertiary)
            }
            TextField("Description", text: entry.description).textFieldStyle(.roundedBorder)
        }
        .padding(10)
        .background(RoundedRectangle(cornerRadius: 8).fill(Color.primary.opacity(0.03)))
    }

    private func load() async {
        isLoading = true
        do {
            about = try await rtdb.fetchAbout()
            original = about
        } catch {
            statusMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func save() async {
        isSaving = true
        rtdb.saveAbout(about)
        original = about
        statusMessage = "Saved"
        isSaving = false

        savedBadgeTask?.cancel()
        savedBadgeVisible = true
        savedBadgeTask = Task {
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            guard !Task.isCancelled else { return }
            savedBadgeVisible = false
        }
    }
}
