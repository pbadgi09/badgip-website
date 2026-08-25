import SwiftUI

struct CustomSectionEditView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @Environment(\.dismiss) private var dismiss

    @State var section: PageSection
    var onSave: (PageSection) -> Void

    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text(section.id.isEmpty ? "New Custom Section" : "Edit Section")
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
                .disabled(isSaving || section.title.isEmpty)
            }
            .padding(20)

            Divider()

            Form {
                Section("Section") {
                    TextField("Title (e.g. \"Software & Language Proficiency\")", text: $section.title)
                    Picker("Show in", selection: $section.mode) {
                        Text("Professional").tag("professional")
                        Text("Personal").tag("personal")
                    }
                }

                Section("Items — each shown as an icon with a label underneath") {
                    itemsEditor
                }

                Text("Icon accepts an emoji (e.g. 🔥) or an image URL / repo-relative path (e.g. assets/icons/swift.png).")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red).font(.caption)
                }
            }
            .padding(.top, 4)
        }
        .frame(minWidth: 560, minHeight: 560)
    }

    @ViewBuilder
    private var itemsEditor: some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach($section.items) { $item in
                HStack {
                    TextField("Icon", text: $item.icon).frame(width: 140).textFieldStyle(.roundedBorder)
                    TextField("Label", text: $item.label).textFieldStyle(.roundedBorder)
                    Stepper("", value: $item.order, in: 0...999).labelsHidden()
                    Button {
                        section.items.removeAll { $0.id == item.id }
                    } label: {
                        Image(systemName: "trash")
                    }
                    .buttonStyle(.badgipIcon(tint: .red))
                }
            }
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
            onSave(section)
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}
