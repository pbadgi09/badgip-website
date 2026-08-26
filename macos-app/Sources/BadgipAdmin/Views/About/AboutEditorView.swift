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
                            highlightsEditor(label: "Highlighted Keywords", keywords: $about.professionalHighlights)
                        }
                        EditorCard(title: "Personal Bio") {
                            TextEditor(text: $about.personalBio)
                                .frame(minHeight: 90)
                            fontSizeControl(label: "Bio font size", size: $about.personalBioFontSize)
                            highlightsEditor(label: "Highlighted Keywords", keywords: $about.personalHighlights)
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
    private func highlightsEditor(label: String, keywords: Binding<[HighlightKeyword]>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            ForEach(keywords) { $item in
                HStack {
                    TextField("Keyword", text: $item.keyword).textFieldStyle(.badgip)
                    ColorPicker(
                        "",
                        selection: Binding(
                            get: { Color(hex: item.color) ?? .badgipAccent },
                            set: { newColor in
                                if let converted = newColor.hexString { item.color = converted }
                            }
                        )
                    )
                    .labelsHidden()
                    Button {
                        keywords.wrappedValue.removeAll { $0.id == item.id }
                    } label: {
                        Image(systemName: "trash")
                    }
                    .buttonStyle(.badgipIcon(tint: .red))
                }
            }
            Button {
                keywords.wrappedValue.append(HighlightKeyword())
            } label: {
                Label("Add Keyword", systemImage: "plus")
            }
            .buttonStyle(.badgipSecondary)
        }
        .padding(.top, 4)
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
    }
}
