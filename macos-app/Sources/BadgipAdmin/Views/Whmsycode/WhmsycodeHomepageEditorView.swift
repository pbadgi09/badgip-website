import SwiftUI

/// Edits whmsycode.com's homepage hero — the one thing about the homepage
/// that isn't per-app content.json. Reads/writes the shared `site.json`
/// (same file Site Settings edits), so both screens race-guard the same way
/// a save-before-load would: `hasChanges` only flips false once the save
/// round-trips successfully.
struct WhmsycodeHomepageEditorView: View {
    let service: WhmsycodeGitHubService
    @ObservedObject var savedToast: SavedToastController
    /// Reported up to WhmsycodeAppListView so switching sub-tabs can warn
    /// before silently discarding an in-progress edit here.
    @Binding var hasUnsavedChanges: Bool
    // Also feeds the app-wide guard (same one About/Settings use) so
    // leaving WHMSYCODE entirely via the main sidebar — not just switching
    // sub-tabs — is covered too; DashboardView.requestNavigation already
    // checks this for every sidebar click.
    @EnvironmentObject private var unsavedGuard: UnsavedChangesGuard

    @State private var settings = WhmsycodeSiteSettings()
    @State private var original = WhmsycodeSiteSettings()
    @State private var isLoading = true
    @State private var loadError: String?
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var hasChanges: Bool { settings != original }

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let loadError {
                VStack(spacing: 10) {
                    Text(loadError).foregroundStyle(.secondary).multilineTextAlignment(.center)
                    Button("Retry") { Task { await load() } }.buttonStyle(.badgipSecondary)
                }
                .padding(24)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        EditorCard(title: "Homepage hero") {
                            LabeledField(label: "Eyebrow", text: $settings.hero.eyebrow)
                            LabeledField(label: "Headline line 1", text: $settings.hero.headlineLine1)
                            LabeledField(label: "Headline line 2 (italic)", text: $settings.hero.headlineLine2)
                            LabeledField(label: "Subtitle", text: $settings.hero.subtitle, multiline: true)
                        }
                        .onChange(of: settings) { _ in
                            hasUnsavedChanges = hasChanges
                            unsavedGuard.hasUnsavedChanges = hasChanges
                        }

                        EditorCard(title: "Hero image") {
                            WhmsycodeImageField(
                                label: "Homepage hero image",
                                storedPath: $settings.heroImage,
                                service: service,
                                repoPath: { "assets/img/homepage-\($0)" },
                                storedPathBuilder: { "/assets/img/homepage-\($0)" }
                            )
                        }

                        EditorCard(title: "Why WHMSYCODE") {
                            ForEach($settings.whyUs) { $item in
                                WhmsycodeFeatureRowEditor(
                                    feature: $item,
                                    service: service,
                                    repoPath: { "assets/img/whyus-\($0)" },
                                    storedPathBuilder: { "/assets/img/whyus-\($0)" }
                                ) {
                                    settings.whyUs.removeAll { $0.id == item.id }
                                }
                            }
                            Button {
                                settings.whyUs.append(WhmsycodeFeature())
                            } label: {
                                Label("Add card", systemImage: "plus")
                            }
                            .buttonStyle(.badgipSecondary)
                        }

                        if let errorMessage {
                            Text(errorMessage).foregroundStyle(.red).font(.caption)
                        }

                        HStack {
                            Spacer()
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
                    }
                    .padding(24)
                }
            }
        }
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        loadError = nil
        do {
            let fetched = try await service.fetchSiteSettings()
            settings = fetched
            original = fetched
            hasUnsavedChanges = false
            unsavedGuard.hasUnsavedChanges = false
        } catch {
            loadError = error.localizedDescription
        }
        isLoading = false
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            try await service.saveSiteSettings(settings, commitMessage: "Update homepage hero")
            original = settings
            hasUnsavedChanges = false
            unsavedGuard.hasUnsavedChanges = false
            savedToast.flash()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}
