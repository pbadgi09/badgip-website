import SwiftUI

struct AboutEditorView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @State private var about = AboutContent()
    @State private var original = AboutContent()
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var statusMessage: String?

    private var hasChanges: Bool { about != original }
    private var showSavedBadge: Bool { statusMessage == "Saved" && !hasChanges }

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
            ForEach(entries) { $entry in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        TextField("Year", text: $entry.year).frame(width: 90).textFieldStyle(.roundedBorder)
                        TextField("Title", text: $entry.title).textFieldStyle(.roundedBorder)
                        Stepper("Order: \(entry.order)", value: $entry.order, in: 0...999).frame(width: 140)
                        Button {
                            entries.wrappedValue.removeAll { $0.id == entry.id }
                        } label: {
                            Image(systemName: "trash")
                        }
                        .buttonStyle(.badgipIcon(tint: .red))
                    }
                    TextField("Description", text: $entry.description).textFieldStyle(.roundedBorder)
                }
                .padding(10)
                .background(RoundedRectangle(cornerRadius: 8).fill(Color.primary.opacity(0.03)))
            }
            Button {
                entries.wrappedValue.append(TimelineEntry(order: entries.wrappedValue.count))
            } label: {
                Label("Add Entry", systemImage: "plus")
            }
            .buttonStyle(.badgipSecondary)
        }
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
    }
}
