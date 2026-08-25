import SwiftUI

struct SectionsView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @State private var allSections: [PageSection] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var mode: String = "professional"
    @State private var editingSection: PageSection?
    @State private var pendingDelete: PageSection?

    private var filtered: [PageSection] {
        allSections.filter { $0.mode == mode }.sorted { $0.order < $1.order }
    }

    // Built-in sections (About/Projects/YouTube/Blog) aren't per-mode by
    // default — e.g. a fresh site only seeds "About" for Professional, so
    // switching to Personal shows nothing for it even after writing a
    // personal bio in the About tab, since there's no section to render it
    // into. This lets the same built-in kind be added again for whichever
    // mode is missing it, same as it can already be reordered/deleted once
    // present.
    private var missingBuiltInKinds: [String] {
        let existing = Set(filtered.map { $0.kind })
        return ["about", "projects", "youtube", "blog"].filter { !existing.contains($0) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Sections").font(.title.weight(.bold))
                Spacer()
                if !missingBuiltInKinds.isEmpty {
                    Menu {
                        ForEach(missingBuiltInKinds, id: \.self) { kind in
                            Button(PageSection(id: "", kind: kind).displayName) {
                                addBuiltIn(kind)
                            }
                        }
                    } label: {
                        Label("Add Section", systemImage: "plus.square")
                    }
                    .buttonStyle(.badgipSecondary)
                }
                Button {
                    editingSection = PageSection(id: "", kind: "custom", mode: mode, order: filtered.count)
                } label: {
                    Label("Add Custom Section", systemImage: "plus")
                }
                .buttonStyle(.badgipPrimary)
            }
            .padding(24)

            Picker("Mode", selection: $mode) {
                Text("Professional").tag("professional")
                Text("Personal").tag("personal")
            }
            .pickerStyle(.segmented)
            .frame(maxWidth: 320)
            .padding(.horizontal, 24)
            .padding(.bottom, 10)

            Text("Drag rows to reorder — the live site's section order and numbering update to match. \"In nav\" controls only the floating nav pill; a section stays on the page in its scroll order either way. Home and Contact always stay first and last.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 24)
                .padding(.bottom, 12)

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red).font(.caption).padding(.horizontal, 24)
            }

            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if filtered.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "square.grid.2x2")
                        .font(.system(size: 40))
                        .foregroundStyle(.tertiary)
                    Text("No sections in this mode yet.")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(filtered) { section in
                        SectionRow(
                            section: section,
                            onEdit: section.kind == "custom" ? { editingSection = section } : nil,
                            onDelete: section.kind == "custom" ? { pendingDelete = section } : nil,
                            onToggleNav: { toggleNav(section) }
                        )
                    }
                    .onMove(perform: move)
                }
                .listStyle(.plain)
            }
        }
        .sheet(item: $editingSection) { section in
            CustomSectionEditView(section: section) { saved in
                if let index = allSections.firstIndex(where: { $0.id == saved.id }) {
                    allSections[index] = saved
                } else {
                    allSections.append(saved)
                }
                editingSection = nil
            }
        }
        .alert(
            "Delete \"\(pendingDelete?.displayName ?? "")\"?",
            isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })
        ) {
            Button("Cancel", role: .cancel) { pendingDelete = nil }
            Button("Delete", role: .destructive) {
                if let section = pendingDelete {
                    rtdb.deletePageSection(id: section.id)
                    allSections.removeAll { $0.id == section.id }
                }
                pendingDelete = nil
            }
        } message: {
            Text("This removes it from the live site immediately and can't be undone.")
        }
        .task { await load() }
    }

    private func move(from source: IndexSet, to destination: Int) {
        var reordered = filtered
        reordered.move(fromOffsets: source, toOffset: destination)

        var renumbered: [PageSection] = []
        for (index, section) in reordered.enumerated() {
            var updated = section
            updated.order = index
            renumbered.append(updated)
            if let allIndex = allSections.firstIndex(where: { $0.id == section.id }) {
                allSections[allIndex] = updated
            }
        }
        rtdb.reorderPageSections(renumbered)
    }

    private func addBuiltIn(_ kind: String) {
        let section = PageSection(id: "", kind: kind, mode: mode, order: filtered.count)
        if let saved = try? rtdb.savePageSection(section) {
            allSections.append(saved)
        }
    }

    private func toggleNav(_ section: PageSection) {
        var updated = section
        updated.showInNav.toggle()
        if let index = allSections.firstIndex(where: { $0.id == section.id }) {
            allSections[index] = updated
        }
        _ = try? rtdb.savePageSection(updated)
    }

    private func load() async {
        isLoading = true
        do {
            allSections = try await rtdb.fetchPageSections()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

private struct SectionRow: View {
    let section: PageSection
    let onEdit: (() -> Void)?
    let onDelete: (() -> Void)?
    let onToggleNav: () -> Void

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: section.systemImage)
                .foregroundStyle(Color.badgipAccent)
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text(section.displayName).font(.headline.weight(.semibold))
                Text(section.isBuiltIn ? "Built-in" : "Custom — \(section.items.count) item\(section.items.count == 1 ? "" : "s")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Toggle(isOn: Binding(get: { section.showInNav }, set: { _ in onToggleNav() })) {
                Text("In nav").font(.caption)
            }
            .toggleStyle(.switch)
            .controlSize(.small)
            if let onEdit {
                Button("Edit", action: onEdit).buttonStyle(.badgipSecondary)
            }
            if let onDelete {
                Button { onDelete() } label: { Image(systemName: "trash") }
                    .buttonStyle(.badgipIcon(tint: .red))
            }
            Image(systemName: "line.3.horizontal")
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 6)
    }
}
