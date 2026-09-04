import SwiftUI

/// Site-wide chrome shared by every page: nav brand, footer text, the
/// default support email (an app's own content.json can still override
/// it), and the two fixed-path site-wide images (favicon, default social
/// preview) — both of those always overwrite the same repo path regardless
/// of the picked file's original name, since every page's <link>/<meta>
/// tag points at one fixed filename rather than a path stored in JSON.
struct WhmsycodeSiteSettingsEditorView: View {
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
                        EditorCard(title: "Site-wide text") {
                            LabeledField(label: "Nav brand (shown top-left on every page)", text: $settings.navBrand)
                            LabeledField(label: "Footer copyright text", text: $settings.footerCopyright)
                            LabeledField(label: "Default support email (apps can override their own)", text: $settings.supportEmail)
                        }
                        .onChange(of: settings) { _ in
                            hasUnsavedChanges = hasChanges
                            unsavedGuard.hasUnsavedChanges = hasChanges
                        }

                        EditorCard(title: "Favicon") {
                            Text("Replaces assets/img/favicon.png on every page — same path, so no other file needs to change.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            WhmsycodeImageField(
                                label: "Favicon",
                                storedPath: $settings.favicon,
                                service: service,
                                maxDimension: 512,
                                repoPath: { _ in "assets/img/favicon.png" },
                                storedPathBuilder: { _ in "assets/img/favicon.png" }
                            )
                        }

                        EditorCard(title: "Default social preview (og:image)") {
                            Text("Used when a page is shared and has no image of its own — patches the homepage's meta tag directly, since crawlers don't run JS.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            WhmsycodeImageField(
                                label: "Default OG image",
                                storedPath: $settings.ogImage,
                                service: service,
                                repoPath: { _ in "assets/img/og-default.png" },
                                storedPathBuilder: { _ in "assets/img/og-default.png" },
                                onUploaded: { stored in
                                    try await service.updateOgImageMetaTag(
                                        path: "index.html",
                                        absoluteImageURL: "https://whmsycode.com/\(stored)",
                                        commitMessage: "Update default og:image"
                                    )
                                }
                            )
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
            try await service.saveSiteSettings(settings, commitMessage: "Update site settings")
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
