import SwiftUI

struct WhmsycodeAppEditorView: View {
    let slug: String
    let service: WhmsycodeGitHubService
    var onSave: (WhmsycodeManifestEntry) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var content = WhmsycodeAppContent()
    @State private var original = WhmsycodeAppContent()
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var loadError: String?
    @State private var errorMessage: String?

    private var hasChanges: Bool { content != original }

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(width: 640, height: 720)
            } else if let loadError {
                VStack(spacing: 12) {
                    Text(loadError).foregroundStyle(.secondary).multilineTextAlignment(.center)
                    Button("Close") { dismiss() }.buttonStyle(.badgipSecondary)
                }
                .padding(24)
                .frame(width: 640, height: 720)
            } else {
                EditorSheet(
                    title: "Edit \(content.title.isEmpty ? slug : content.title)",
                    isSaving: isSaving,
                    canSave: hasChanges,
                    hasChanges: hasChanges,
                    onCancel: { dismiss() },
                    onSave: { Task { await save() } }
                ) {
                    EditorCard(title: "Hero") {
                        LabeledField(label: "App title (used in meta/tab title)", text: $content.title)
                        LabeledField(label: "Eyebrow", text: $content.eyebrow)
                        LabeledField(label: "Headline line 1", text: $content.heroTitleLine1)
                        LabeledField(label: "Headline line 2 (italic)", text: $content.heroTitleLine2)
                        LabeledField(label: "Subtitle", text: $content.subtitle, multiline: true)
                    }

                    EditorCard(title: "Store links") {
                        LabeledField(label: "App Store URL", text: $content.appStoreUrl)
                        LabeledField(label: "Google Play URL", text: $content.googlePlayUrl)
                        LabeledField(label: "Support email", text: $content.supportEmail)
                    }

                    EditorCard(title: "Images") {
                        WhmsycodeImageField(
                            label: "Hero mockup (vertical phone photo)",
                            storedPath: $content.heroImage,
                            service: service,
                            repoPath: { "\(slug)/img/\($0)" },
                            storedPathBuilder: { "/\(slug)/img/\($0)" }
                        )
                        WhmsycodeImageField(
                            label: "16:9 screenshot",
                            storedPath: $content.sixteenNineImage,
                            service: service,
                            repoPath: { "\(slug)/img/\($0)" },
                            storedPathBuilder: { "/\(slug)/img/\($0)" }
                        )
                        WhmsycodeImageField(
                            label: "Social preview (og:image) — patches this page's meta tag directly",
                            storedPath: $content.ogImage,
                            service: service,
                            repoPath: { "\(slug)/img/\($0)" },
                            storedPathBuilder: { "/\(slug)/img/\($0)" },
                            onUploaded: { stored in
                                try await service.updateOgImageMetaTag(
                                    path: "\(slug)/index.html",
                                    absoluteImageURL: "https://whmsycode.com\(stored)",
                                    commitMessage: "Update og:image for \(slug)"
                                )
                            }
                        )
                    }

                    EditorCard(title: "Features") {
                        ForEach($content.features) { $feature in
                            WhmsycodeFeatureRowEditor(
                                feature: $feature,
                                service: service,
                                repoPath: { "\(slug)/img/\($0)" },
                                storedPathBuilder: { "/\(slug)/img/\($0)" }
                            ) {
                                content.features.removeAll { $0.id == feature.id }
                            }
                        }
                        Button {
                            content.features.append(WhmsycodeFeature())
                        } label: {
                            Label("Add feature", systemImage: "plus")
                        }
                        .buttonStyle(.badgipSecondary)
                    }

                    EditorCard(title: "Terms of Use") {
                        LabeledField(label: "Last updated", text: $content.terms.updated)
                        ForEach($content.terms.sections) { $section in
                            LegalSectionRowEditor(section: $section) {
                                content.terms.sections.removeAll { $0.id == section.id }
                            }
                        }
                        Button {
                            content.terms.sections.append(WhmsycodeLegalSection())
                        } label: {
                            Label("Add section", systemImage: "plus")
                        }
                        .buttonStyle(.badgipSecondary)
                    }

                    EditorCard(title: "Privacy Policy") {
                        LabeledField(label: "Last updated", text: $content.privacy.updated)
                        ForEach($content.privacy.sections) { $section in
                            LegalSectionRowEditor(section: $section) {
                                content.privacy.sections.removeAll { $0.id == section.id }
                            }
                        }
                        Button {
                            content.privacy.sections.append(WhmsycodeLegalSection())
                        } label: {
                            Label("Add section", systemImage: "plus")
                        }
                        .buttonStyle(.badgipSecondary)
                    }

                    if let errorMessage {
                        Text(errorMessage).foregroundStyle(.red).font(.caption)
                    }
                }
            }
        }
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        loadError = nil
        do {
            let fetched = try await service.fetchAppContent(slug: slug)
            content = fetched
            original = fetched
        } catch {
            loadError = error.localizedDescription
        }
        isLoading = false
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            try await service.saveAppContent(content, slug: slug, commitMessage: "Update content for \(slug)")

            // Keep apps/manifest.json (which drives the homepage app grid) in
            // sync with this page's title/subtitle — otherwise the homepage
            // card would silently go stale after an edit here. Mutates the
            // existing entry in place so a hand-set `icon` isn't clobbered.
            var manifest = try await service.fetchManifest()
            if let index = manifest.firstIndex(where: { $0.slug == slug }) {
                manifest[index].title = content.title
                manifest[index].tagline = content.subtitle
            } else {
                manifest.append(WhmsycodeManifestEntry(
                    slug: slug,
                    title: content.title,
                    tagline: content.subtitle,
                    icon: String(content.title.prefix(2)).uppercased()
                ))
            }
            try await service.saveManifest(manifest, commitMessage: "Sync manifest entry for \(slug)")

            // Only mark the local "saved" baseline once *both* writes
            // succeed — if the manifest sync throws, hasChanges must stay
            // true so the Save button is still enabled for a retry, instead
            // of silently looking saved while the manifest is still stale.
            original = content
            let savedEntry = manifest.first(where: { $0.slug == slug }) ?? WhmsycodeManifestEntry(
                slug: slug, title: content.title, tagline: content.subtitle, icon: String(content.title.prefix(2)).uppercased()
            )
            onSave(savedEntry)
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}

private struct LegalSectionRowEditor: View {
    @Binding var section: WhmsycodeLegalSection
    var onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                LabeledField(label: "Heading", text: $section.heading)
                Button {
                    onDelete()
                } label: {
                    Image(systemName: "trash")
                }
                .buttonStyle(.badgipIcon(tint: .red))
            }
            LabeledField(label: "Body", text: $section.body, multiline: true)
            Divider()
        }
    }
}

