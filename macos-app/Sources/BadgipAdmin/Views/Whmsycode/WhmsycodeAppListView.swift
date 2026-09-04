import SwiftUI

private enum WhmsycodeTab: String, CaseIterable, Identifiable {
    case apps = "Apps"
    case homepage = "Homepage"
    case siteSettings = "Site Settings"
    var id: String { rawValue }
}

/// Root of the WHMSYCODE sidebar section. Everything about whmsycode.com
/// lives under this one section (per the user's explicit request to not add
/// more top-level sidebar tabs) — a sub-tab switcher below the shared
/// GitHub-access card, rather than badgip's pattern of one sidebar row per
/// content type.
struct WhmsycodeAppListView: View {
    @State private var selectedTab: WhmsycodeTab = .apps

    // PAT field intentionally never pre-fills from Keychain — mirrors
    // DeployControlsView.swift's proven-working pattern exactly. An earlier
    // version here pre-filled `pat` from KeychainService.read(...), which
    // left the field showing the real secret as an unbroken row of dots
    // with no obvious way to select-and-replace it (reported as "unable to
    // edit"). Starting empty + a separate "token is saved" status line
    // avoids that entirely.
    @State private var patInput = ""
    @State private var hasSavedToken = false
    @StateObject private var savedToast = SavedToastController()

    // Homepage/Site Settings each report whether they have an unsaved edit
    // so switching sub-tabs can warn before silently discarding it — same
    // idea as DashboardView's UnsavedChangesGuard, just scoped to this
    // sub-tab switcher rather than the app's main sidebar. Apps has no
    // entry here since every action there (create/edit/delete/reorder)
    // already persists immediately, with no separate unsaved-draft state.
    @State private var homepageHasChanges = false
    @State private var siteSettingsHasChanges = false
    @State private var pendingTab: WhmsycodeTab?
    @State private var showDiscardConfirm = false

    private let service = WhmsycodeGitHubService()

    private var hasUnsavedChangesInCurrentTab: Bool {
        switch selectedTab {
        case .apps: return false
        case .homepage: return homepageHasChanges
        case .siteSettings: return siteSettingsHasChanges
        }
    }

    private var tabSelection: Binding<WhmsycodeTab> {
        Binding(
            get: { selectedTab },
            set: { newTab in
                guard newTab != selectedTab else { return }
                if hasUnsavedChangesInCurrentTab {
                    pendingTab = newTab
                    showDiscardConfirm = true
                } else {
                    selectedTab = newTab
                }
            }
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("WHMSYCODE")
                .font(.title.weight(.bold))
                .padding(24)
                .padding(.bottom, 0)

            EditorCard(title: "GitHub access") {
                Text("A fine-grained personal access token scoped to the whmsycode.com-website repo (Contents: Read/write).")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(hasSavedToken ? "A token is saved in Keychain." : "No token saved yet.")
                    .font(.caption)
                    .foregroundStyle(hasSavedToken ? Color.secondary : Color.orange)
                HStack {
                    SecureField("GitHub personal access token", text: $patInput)
                        .textFieldStyle(.badgip)
                    Button("Save") {
                        KeychainService.save(key: KeychainKey.whmsycodeGitHubPAT, value: patInput)
                        patInput = ""
                        hasSavedToken = true
                        savedToast.flash()
                    }
                    .buttonStyle(.badgipSecondary)
                    .disabled(patInput.isEmpty)
                }
                if hasSavedToken {
                    Button("Remove Saved Token", role: .destructive) {
                        KeychainService.delete(key: KeychainKey.whmsycodeGitHubPAT)
                        hasSavedToken = false
                        savedToast.flash()
                    }
                    .buttonStyle(.badgipSecondary)
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 16)

            Picker("", selection: tabSelection) {
                ForEach(WhmsycodeTab.allCases) { tab in
                    Text(tab.rawValue).tag(tab)
                }
            }
            .pickerStyle(.segmented)
            .labelsHidden()
            .frame(maxWidth: 420, alignment: .leading)
            .padding(.horizontal, 24)
            .padding(.vertical, 16)

            Group {
                switch selectedTab {
                case .apps:
                    WhmsycodeAppsTabView(service: service, savedToast: savedToast)
                case .homepage:
                    WhmsycodeHomepageEditorView(service: service, savedToast: savedToast, hasUnsavedChanges: $homepageHasChanges)
                case .siteSettings:
                    WhmsycodeSiteSettingsEditorView(service: service, savedToast: savedToast, hasUnsavedChanges: $siteSettingsHasChanges)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .savedToast(savedToast)
        .alert("Discard unsaved changes?", isPresented: $showDiscardConfirm) {
            Button("Discard", role: .destructive) {
                if let pendingTab {
                    selectedTab = pendingTab
                    if pendingTab != .homepage { homepageHasChanges = false }
                    if pendingTab != .siteSettings { siteSettingsHasChanges = false }
                }
                pendingTab = nil
            }
            Button("Keep Editing", role: .cancel) { pendingTab = nil }
        } message: {
            Text("You have unsaved changes on this screen that will be lost.")
        }
        .onAppear {
            hasSavedToken = (KeychainService.read(key: KeychainKey.whmsycodeGitHubPAT)?.isEmpty == false)
        }
    }
}

/// What sheet (if any) is on screen. Deliberately a single `Identifiable`
/// enum behind one `.sheet(item:)`, not two separate `.sheet(isPresented:)`
/// modifiers on the same view — stacking multiple `.sheet` modifiers on one
/// view is a known-unreliable SwiftUI pattern (only one tends to actually
/// respond). `ProjectListView.swift` avoids this the same way, just via a
/// reused-model trick instead of an enum, since New/Edit are the same view
/// there; here they're different views, so an enum is the natural fit.
private enum WhmsycodeAppSheet: Identifiable {
    case newApp
    case editApp(slug: String)

    var id: String {
        switch self {
        case .newApp: return "new"
        case .editApp(let slug): return "edit-\(slug)"
        }
    }
}

private struct WhmsycodeAppsTabView: View {
    let service: WhmsycodeGitHubService
    @ObservedObject var savedToast: SavedToastController

    @State private var apps: [WhmsycodeManifestEntry] = []
    @State private var isLoading = true
    @State private var loadError: String?
    @State private var actionError: String?
    @State private var activeSheet: WhmsycodeAppSheet?
    @State private var pendingDelete: WhmsycodeManifestEntry?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Apps").font(.title2.weight(.bold))
                Spacer()
                Button {
                    activeSheet = .newApp
                } label: {
                    Label("New App", systemImage: "plus")
                }
                .buttonStyle(.badgipPrimary)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 12)

            if let actionError {
                Text(actionError)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 8)
            }

            Group {
                if isLoading {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let loadError {
                    VStack(spacing: 10) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 32))
                            .foregroundStyle(.secondary)
                        Text(loadError)
                            .foregroundStyle(.secondary)
                            .font(.callout)
                            .multilineTextAlignment(.center)
                        Button("Retry") { Task { await load() } }
                            .buttonStyle(.badgipSecondary)
                    }
                    .padding(24)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if apps.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "globe")
                            .font(.system(size: 40))
                            .foregroundStyle(.tertiary)
                        Text("No apps yet — add your first one.")
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        ForEach(apps) { app in
                            WhmsycodeAppRow(
                                app: app,
                                onEdit: { activeSheet = .editApp(slug: app.slug) },
                                onDelete: { pendingDelete = app }
                            )
                            .listRowInsets(EdgeInsets())
                        }
                        .onMove(perform: move)
                    }
                    .listStyle(.plain)
                }
            }
        }
        .sheet(item: $activeSheet) { sheet in
            switch sheet {
            case .newApp:
                WhmsycodeNewAppView(service: service) { created in
                    apps.append(created)
                    activeSheet = nil
                    savedToast.flash()
                }
            case .editApp(let slug):
                WhmsycodeAppEditorView(slug: slug, service: service) { updated in
                    if let index = apps.firstIndex(where: { $0.slug == updated.slug }) {
                        apps[index] = updated
                    }
                    activeSheet = nil
                    savedToast.flash()
                }
            }
        }
        .alert(
            "Delete \"\(pendingDelete?.title ?? "")\"?",
            isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })
        ) {
            Button("Cancel", role: .cancel) { pendingDelete = nil }
            Button("Delete", role: .destructive) {
                if let app = pendingDelete {
                    Task { await delete(app) }
                }
                pendingDelete = nil
            }
        } message: {
            Text("This permanently deletes this app's page, legal pages, content, and images from GitHub. It can't be undone from here.")
        }
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        loadError = nil
        do {
            apps = try await service.fetchManifest()
        } catch {
            loadError = error.localizedDescription
        }
        isLoading = false
    }

    private func move(from source: IndexSet, to destination: Int) {
        actionError = nil
        apps.move(fromOffsets: source, toOffset: destination)
        let reordered = apps
        Task {
            do {
                try await service.saveManifest(reordered, commitMessage: "Reorder apps")
                savedToast.flash()
            } catch {
                actionError = error.localizedDescription
            }
        }
    }

    /// Best-effort on the app's own content lookup (proceeds with just the
    /// always-present base files if content.json is already missing/corrupt),
    /// but a real failure deleting any known file stops the whole operation
    /// before the manifest entry is removed — so a partial failure never
    /// looks like a completed delete.
    ///
    /// Images are deleted *before* content.json, not after: content.json is
    /// the only place the image paths are recorded, so if a retry is needed
    /// after a partial failure, it can still look them up as long as
    /// content.json hasn't been deleted yet. Deleting content.json first (as
    /// an earlier version did) meant a failure partway through the image
    /// deletes left them permanently orphaned — a retry could no longer
    /// discover their paths at all.
    private func delete(_ app: WhmsycodeManifestEntry) async {
        actionError = nil
        do {
            let content = try? await service.fetchAppContent(slug: app.slug)
            var filesToDelete: [String] = []
            if let content {
                for path in [content.heroImage, content.sixteenNineImage, content.ogImage] where !path.isEmpty {
                    filesToDelete.append("\(app.slug)/\(path)")
                }
            }
            filesToDelete.append(contentsOf: [
                "\(app.slug)/index.html",
                "\(app.slug)/terms.html",
                "\(app.slug)/privacy.html",
                "\(app.slug)/content.json",
            ])
            for path in filesToDelete {
                try await service.deleteFile(path: path, commitMessage: "Delete \(app.slug): \(path)")
            }

            var manifest = try await service.fetchManifest()
            manifest.removeAll { $0.slug == app.slug }
            try await service.saveManifest(manifest, commitMessage: "Remove \(app.title) from apps manifest")
            try? await service.removeSitemapEntry(slug: app.slug)
            apps = manifest
            savedToast.flash()
        } catch {
            actionError = error.localizedDescription
        }
    }
}

private struct WhmsycodeAppRow: View {
    let app: WhmsycodeManifestEntry
    let onEdit: () -> Void
    let onDelete: () -> Void
    @State private var isHovering = false

    var body: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 6) {
                Text(app.title).font(.headline.weight(.semibold))
                Text(app.tagline).font(.caption).foregroundStyle(.secondary).lineLimit(2)
            }
            Spacer()
            Button("Edit", action: onEdit).buttonStyle(.badgipSecondary)
            Button {
                onDelete()
            } label: {
                Image(systemName: "trash")
            }
            .buttonStyle(.badgipIcon(tint: .red))
            Image(systemName: "line.3.horizontal").foregroundStyle(.tertiary)
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 12).fill(isHovering ? Color.badgipSurfaceHover : Color.badgipSurface))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color.badgipBorder, lineWidth: 1))
        .onHover { isHovering = $0 }
        .animation(.easeOut(duration: 0.15), value: isHovering)
    }
}
