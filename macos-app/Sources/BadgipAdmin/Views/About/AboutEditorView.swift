import SwiftUI

struct AboutEditorView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @EnvironmentObject private var unsavedGuard: UnsavedChangesGuard
    @State private var about = AboutContent()
    @State private var original = AboutContent()
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var statusMessage: String?
    @StateObject private var savedToast = SavedToastController()
    @State private var draftProfessionalKeyword = ""
    @State private var draftPersonalKeyword = ""
    // About only persists on a deliberate Save click (unlike most other
    // screens, which write to RTDB instantly) — so removing a timeline
    // row must NOT delete its logo file right away, or cancelling out of
    // this screen would leave RTDB still pointing at a now-deleted file.
    // Collected here and only actually deleted once save() has committed.
    @State private var pendingLogoDeletions: [String] = []

    private var hasChanges: Bool { about != original }
    // "Saved" only shows for a few seconds after a save, and only while
    // nothing has changed since — so it never lingers indefinitely, and a
    // new edit hides it immediately rather than falsely implying it's
    // already saved.
    private var showSavedBadge: Bool { savedToast.isVisible && !hasChanges }

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
                            fontSizeControl(label: "Bio font size", size: $about.professionalBioFontSize)
                            highlightsEditor(label: "Highlighted Keywords", keywords: $about.professionalHighlights, draft: $draftProfessionalKeyword)
                        }
                        EditorCard(title: "Personal Bio") {
                            TextEditor(text: $about.personalBio)
                                .frame(minHeight: 90)
                            fontSizeControl(label: "Bio font size", size: $about.personalBioFontSize)
                            highlightsEditor(label: "Highlighted Keywords", keywords: $about.personalHighlights, draft: $draftPersonalKeyword)
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
        .onChange(of: hasChanges) { unsavedGuard.hasUnsavedChanges = $0 }
        .onDisappear { unsavedGuard.hasUnsavedChanges = false }
    }

    @ViewBuilder
    private func fontSizeControl(label: String, size: Binding<Int>) -> some View {
        HStack(spacing: 10) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            Stepper(
                size.wrappedValue > 0 ? "\(size.wrappedValue)px" : "Default",
                value: size,
                in: 0...96,
                step: 2
            )
            .frame(width: 140)
            if size.wrappedValue > 0 {
                Button("Reset") { size.wrappedValue = 0 }
                    .buttonStyle(.badgipSecondary)
                    .controlSize(.small)
            }
        }
        .padding(.top, 4)
    }

    @ViewBuilder
    private func highlightsEditor(label: String, keywords: Binding<[HighlightKeyword]>, draft: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label).font(.caption).foregroundStyle(.secondary)

            if !keywords.wrappedValue.isEmpty {
                FlowLayout(data: keywords.wrappedValue, spacing: 8) { item in
                    KeywordPill(
                        keyword: item,
                        onColorChange: { newColor in
                            if let index = keywords.wrappedValue.firstIndex(where: { $0.id == item.id }) {
                                keywords.wrappedValue[index].color = newColor
                            }
                        },
                        onDelete: {
                            keywords.wrappedValue.removeAll { $0.id == item.id }
                        }
                    )
                }
            }

            HStack {
                TextField("Add keyword, then press Return", text: draft)
                    .textFieldStyle(.badgip)
                    .onSubmit { addKeyword(to: keywords, draft: draft) }
                Button {
                    addKeyword(to: keywords, draft: draft)
                } label: {
                    Label("Add", systemImage: "plus")
                }
                .buttonStyle(.badgipSecondary)
                .disabled(draft.wrappedValue.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(.top, 4)
    }

    private func addKeyword(to keywords: Binding<[HighlightKeyword]>, draft: Binding<String>) {
        let trimmed = draft.wrappedValue.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        keywords.wrappedValue.append(HighlightKeyword(keyword: trimmed))
        draft.wrappedValue = ""
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
                        if RepoFileCleanup.isInternalPath(entry.logo) {
                            pendingLogoDeletions.append(entry.logo)
                        }
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
                    commitMessage: { "Set timeline logo: \($0)" },
                    onReplaced: { pendingLogoDeletions.append($0) }
                )
                TextField("Year", text: entry.year).frame(width: 70).textFieldStyle(.badgip)
                TextField("End (optional)", text: entry.endYear).frame(width: 100).textFieldStyle(.badgip)
                TextField("Title", text: entry.title).textFieldStyle(.badgip)
                Button(action: onDelete) {
                    Image(systemName: "trash")
                }
                .buttonStyle(.badgipIcon(tint: .red))
                Image(systemName: "line.3.horizontal")
                    .foregroundStyle(.tertiary)
            }
            TextField("Description", text: entry.description).textFieldStyle(.badgip)
        }
        .padding(10)
        .background(RoundedRectangle(cornerRadius: 8).fill(Color.badgipSurface))
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
        savedToast.flash(seconds: 3)
        RepoFileCleanup.deleteStoredImages(pendingLogoDeletions, commitMessage: "Remove logo for deleted timeline entry")
        pendingLogoDeletions = []
    }
}

private struct KeywordPill: View {
    let keyword: HighlightKeyword
    let onColorChange: (String) -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(spacing: 6) {
            ZStack {
                Circle()
                    .fill(Color(hex: keyword.color) ?? .badgipAccent)
                    .frame(width: 14, height: 14)
                // A real ColorPicker, made effectively invisible but still
                // hit-testable, layered over the plain circle above — lets
                // tapping the circle open the system color panel without
                // giving up the compact custom-drawn swatch look.
                ColorPicker(
                    "",
                    selection: Binding(
                        get: { Color(hex: keyword.color) ?? .badgipAccent },
                        set: { newColor in
                            if let converted = newColor.hexString { onColorChange(converted) }
                        }
                    )
                )
                .labelsHidden()
                .opacity(0.015)
                .frame(width: 14, height: 14)
            }
            Text(keyword.keyword)
                .font(.callout)
                .lineLimit(1)
            Button(action: onDelete) {
                Image(systemName: "xmark")
                    .font(.system(size: 9, weight: .bold))
                    .padding(3)
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Capsule().fill(Color.badgipSurfaceHover))
        .overlay(Capsule().strokeBorder(Color.badgipBorder))
        .fixedSize()
    }
}
