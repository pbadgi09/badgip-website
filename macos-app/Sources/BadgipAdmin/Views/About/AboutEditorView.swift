import SwiftUI

struct AboutEditorView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @State private var about = AboutContent()
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var statusMessage: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("About").font(.title2.bold())
                Spacer()
                if let statusMessage {
                    Text(statusMessage).font(.caption).foregroundStyle(.secondary)
                }
                Button("Save") { Task { await save() } }
                    .buttonStyle(.borderedProminent)
                    .disabled(isSaving)
            }
            .padding()

            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                Form {
                    Section("Professional Bio") {
                        TextEditor(text: $about.professionalBio).frame(minHeight: 100)
                    }
                    Section("Personal Bio") {
                        TextEditor(text: $about.personalBio).frame(minHeight: 100)
                    }

                    Section("Professional Timeline") {
                        timelineEditor(entries: $about.professionalTimeline)
                    }
                    Section("Personal Timeline") {
                        timelineEditor(entries: $about.personalTimeline)
                    }
                }
            }
        }
        .task { await load() }
    }

    @ViewBuilder
    private func timelineEditor(entries: Binding<[TimelineEntry]>) -> some View {
        ForEach(entries) { $entry in
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    TextField("Year", text: $entry.year).frame(width: 100)
                    TextField("Title", text: $entry.title)
                    Stepper("Order: \(entry.order)", value: $entry.order, in: 0...999).frame(width: 130)
                    Button(role: .destructive) {
                        entries.wrappedValue.removeAll { $0.id == entry.id }
                    } label: {
                        Image(systemName: "trash")
                    }
                }
                TextField("Description", text: $entry.description)
            }
            .padding(.vertical, 4)
        }
        Button {
            entries.wrappedValue.append(TimelineEntry(order: entries.wrappedValue.count))
        } label: {
            Label("Add Entry", systemImage: "plus")
        }
    }

    private func load() async {
        isLoading = true
        do {
            about = try await rtdb.fetchAbout()
        } catch {
            statusMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func save() async {
        isSaving = true
        rtdb.saveAbout(about)
        statusMessage = "Saved"
        isSaving = false
    }
}
