import SwiftUI

struct SiteSettingsView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @EnvironmentObject private var unsavedGuard: UnsavedChangesGuard
    @State private var settings = SiteSettings()
    @State private var original = SiteSettings()
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var statusMessage: String?
    @StateObject private var savedToast = SavedToastController()
    @State private var ogImageStatus: String?
    // This screen only persists on Save (Cancel/navigating away discards
    // in-memory edits, guarded by UnsavedChangesGuard) — so a replaced or
    // cleared image's old file must not be deleted until save() actually
    // commits, or discarding the edit would leave RTDB pointing at a file
    // that's already gone.
    @State private var pendingImageDeletions: [String] = []

    private var hasChanges: Bool { settings != original }
    // "Saved" only shows for a few seconds after a save, and only while
    // nothing has changed since — so it never lingers indefinitely, and a
    // new edit hides it immediately rather than falsely implying it's
    // already saved.
    private var showSavedBadge: Bool { savedToast.isVisible && !hasChanges }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Site Settings").font(.title.weight(.bold))
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
                        EditorCard(title: "Hero") {
                            LabeledField(label: "Greeting", text: $settings.greeting)
                            LabeledField(label: "Name", text: $settings.name)
                            LabeledField(label: "Role", text: $settings.role)
                            LabeledField(label: "Description", text: $settings.description)
                            LabeledField(label: "Primary CTA text", text: $settings.ctaPrimaryText)
                            LinkField(label: "Primary CTA link", text: $settings.ctaPrimaryHref)
                            LabeledField(label: "Secondary CTA text", text: $settings.ctaSecondaryText)
                            LinkField(label: "Secondary CTA link", text: $settings.ctaSecondaryHref)
                        }

                        EditorCard(title: "Hero — profile picture (optional)") {
                            SingleImageUploadView(
                                path: $settings.profileImage,
                                buttonLabel: "Set Profile Picture",
                                thumbnailWidth: 64,
                                thumbnailHeight: 64,
                                thumbnailCornerRadius: 32,
                                repoPath: { ImagePathBuilder.heroProfileRepoPath(filename: $0) },
                                storedPath: { ImagePathBuilder.heroProfileStoredPath(filename: $0) },
                                commitMessage: { "Set hero profile picture: \($0)" },
                                onReplaced: { pendingImageDeletions.append($0) }
                            )
                        }

                        EditorCard(title: "Social") {
                            Text("These render as real brand icons in the site footer. Contact — social icons (below) is separate and supports any platform via a custom icon/URL.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            LabeledField(label: "GitHub URL", text: $settings.github)
                            LabeledField(label: "LinkedIn URL", text: $settings.linkedin)
                            LabeledField(label: "Twitter/X URL", text: $settings.twitter)
                            LabeledField(label: "Email", text: $settings.email)
                        }

                        EditorCard(title: "Navigation") {
                            Text("About and Projects get their nav labels from Sections — this only covers Home and Contact, the two fixed anchors.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            navItemField(href: "#home", defaultLabel: "Home", defaultNumber: "00")
                            navItemField(href: "#contact", defaultLabel: "Contact", defaultNumber: "—")
                        }

                        EditorCard(title: "Theme — Light") {
                            OptionalColorField(label: "Background", hex: $settings.themeLight.background, fallback: "#ffffff")
                            OptionalColorField(label: "Text", hex: $settings.themeLight.text, fallback: "#0a0a0a")
                            OptionalColorField(label: "Accent", hex: $settings.themeLight.accent, fallback: "#3effa3")
                            OptionalColorField(label: "Border", hex: $settings.themeLight.border, fallback: "#e2e2e2")
                        }

                        EditorCard(title: "Theme — Dark") {
                            OptionalColorField(label: "Background", hex: $settings.themeDark.background, fallback: "#0a0a0c")
                            OptionalColorField(label: "Text", hex: $settings.themeDark.text, fallback: "#f5f5f5")
                            OptionalColorField(label: "Accent", hex: $settings.themeDark.accent, fallback: "#3effa3")
                            OptionalColorField(label: "Border", hex: $settings.themeDark.border, fallback: "#2a2a30")
                        }

                        EditorCard(title: "Meta") {
                            LabeledField(label: "Page title", text: $settings.metaTitle)
                            LabeledField(label: "Meta description", text: $settings.metaDescription)
                            Text("Social preview image (og:image) — shown when the site link is shared on iMessage/Slack/X/etc. A 1200×630 landscape image works best.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            SingleImageUploadView(
                                path: $settings.ogImage,
                                buttonLabel: "Set Preview Image",
                                thumbnailWidth: 96,
                                thumbnailHeight: 50,
                                thumbnailCornerRadius: 6,
                                repoPath: { ImagePathBuilder.ogImageRepoPath(filename: $0) },
                                storedPath: { ImagePathBuilder.ogImageStoredPath(filename: $0) },
                                commitMessage: { "Set social preview image: \($0)" },
                                onUploaded: { stored in
                                    Task { await updateOgImageTag(storedPath: stored) }
                                },
                                onReplaced: { pendingImageDeletions.append($0) }
                            )
                            if let ogImageStatus {
                                Text(ogImageStatus).font(.caption2).foregroundStyle(.secondary)
                            }
                        }

                        // Grouped — the outer VStack was already at
                        // SwiftUI's 10-child ViewBuilder limit before the
                        // Navigation card was added; a Group here keeps it
                        // under that without changing anything visually.
                        Group {
                            EditorCard(title: "Contact — page copy") {
                                LabeledField(label: "Form heading", text: $settings.contactHeading)
                                LabeledField(label: "Form subheading", text: $settings.contactSubheading)
                                LabeledField(label: "Info panel title", text: $settings.contactInfoTitle)
                                LabeledField(label: "Info panel subtitle", text: $settings.contactInfoSubtitle)
                            }

                            EditorCard(title: "Contact — background photo") {
                                Text("A tall portrait photo works best — it sits behind the info panel.")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                SingleImageUploadView(
                                    path: $settings.contactBackgroundImage,
                                    buttonLabel: "Set Background Photo",
                                    repoPath: { ImagePathBuilder.contactBackgroundRepoPath(filename: $0) },
                                    storedPath: { ImagePathBuilder.contactBackgroundStoredPath(filename: $0) },
                                    commitMessage: { "Set contact background photo: \($0)" },
                                    onReplaced: { pendingImageDeletions.append($0) }
                                )
                            }

                            EditorCard(title: "Contact — info rows (address, phone, email, ...)") {
                                contactInfoItemsEditor
                            }

                            EditorCard(title: "Contact — social icons") {
                                contactSocialLinksEditor
                            }
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
    private func navItemField(href: String, defaultLabel: String, defaultNumber: String) -> some View {
        LabeledField(label: defaultLabel, text: navLabelBinding(href: href, defaultLabel: defaultLabel, defaultNumber: defaultNumber))
    }

    // Home/Contact are the only two nav.items entries the website actually
    // reads (see js/render-home.js's applyNavItems) — About/Projects get
    // their nav labels from the dynamic page-sections system instead, so
    // there's no slot for them here. Creates the entry on first edit rather
    // than requiring it to pre-exist, since navItems can start empty.
    private func navLabelBinding(href: String, defaultLabel: String, defaultNumber: String) -> Binding<String> {
        Binding(
            get: { settings.navItems.first(where: { $0.href == href })?.label ?? defaultLabel },
            set: { newValue in
                if let index = settings.navItems.firstIndex(where: { $0.href == href }) {
                    settings.navItems[index].label = newValue
                } else {
                    settings.navItems.append(NavItem(label: newValue, href: href, number: defaultNumber))
                }
            }
        )
    }

    @ViewBuilder
    private var contactInfoItemsEditor: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach($settings.contactInfoItems) { $item in
                HStack(alignment: .top) {
                    IconPickerField(
                        icon: $item.icon,
                        repoPath: { ImagePathBuilder.contactIconRepoPath(itemId: item.id, filename: $0) },
                        storedPath: { ImagePathBuilder.contactIconStoredPath(itemId: item.id, filename: $0) },
                        commitMessage: { "Set contact info icon: \($0)" },
                        onReplaced: { pendingImageDeletions.append($0) }
                    )
                    .frame(width: 220)
                    TextField("Label (e.g. \"42 Berlin St\" or an email)", text: $item.label).textFieldStyle(.badgip)
                    Button {
                        settings.contactInfoItems.removeAll { $0.id == item.id }
                        if RepoFileCleanup.isInternalImagePath(item.icon) { pendingImageDeletions.append(item.icon) }
                    } label: {
                        Image(systemName: "trash")
                    }
                    .buttonStyle(.badgipIcon(tint: .red))
                }
            }
            Button {
                settings.contactInfoItems.append(ContactInfoItem())
            } label: {
                Label("Add Row", systemImage: "plus")
            }
            .buttonStyle(.badgipSecondary)
        }
    }

    @ViewBuilder
    private var contactSocialLinksEditor: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach($settings.contactSocialLinks) { $link in
                HStack(alignment: .top) {
                    IconPickerField(
                        icon: $link.icon,
                        repoPath: { ImagePathBuilder.contactIconRepoPath(itemId: link.id, filename: $0) },
                        storedPath: { ImagePathBuilder.contactIconStoredPath(itemId: link.id, filename: $0) },
                        commitMessage: { "Set contact social icon: \($0)" },
                        onReplaced: { pendingImageDeletions.append($0) }
                    )
                    .frame(width: 220)
                    TextField("URL", text: $link.url).textFieldStyle(.badgip)
                    Button {
                        settings.contactSocialLinks.removeAll { $0.id == link.id }
                        if RepoFileCleanup.isInternalImagePath(link.icon) { pendingImageDeletions.append(link.icon) }
                    } label: {
                        Image(systemName: "trash")
                    }
                    .buttonStyle(.badgipIcon(tint: .red))
                }
            }
            Button {
                settings.contactSocialLinks.append(ContactSocialLink())
            } label: {
                Label("Add Social Link", systemImage: "plus")
            }
            .buttonStyle(.badgipSecondary)
        }
    }

    private func load() async {
        isLoading = true
        do {
            settings = try await rtdb.fetchSettings()
            original = settings
        } catch {
            statusMessage = error.localizedDescription
        }
        isLoading = false
    }

    // Social-media crawlers don't run JS, so saving ogImage to Firebase
    // alone would never show up in a real link preview — this static site
    // has no build step to template settings into the HTML at deploy time,
    // so the app commits the edit to index.html's og:image tag directly,
    // the same way it already commits content images.
    private func updateOgImageTag(storedPath: String) async {
        ogImageStatus = "Updating social preview image…"
        do {
            let githubService = GitHubService()
            let content = try await githubService.fetchFileContent(path: "index.html")
            let newURL = ImagePathBuilder.ogImageSiteURL(storedPath: storedPath)
            let pattern = #"<meta property="og:image" content="[^"]*" />"#
            let replacement = "<meta property=\"og:image\" content=\"\(newURL)\" />"
            let regex = try NSRegularExpression(pattern: pattern)
            let range = NSRange(content.startIndex..., in: content)
            let updated = regex.stringByReplacingMatches(
                in: content, range: range,
                withTemplate: NSRegularExpression.escapedTemplate(for: replacement)
            )
            guard updated != content, let data = updated.data(using: .utf8) else {
                ogImageStatus = "Couldn't find the og:image tag to update in index.html."
                return
            }
            try await githubService.uploadFile(path: "index.html", data: data, commitMessage: "Update social preview image")
            ogImageStatus = "Social preview image updated."
        } catch {
            ogImageStatus = "Image uploaded, but updating index.html failed: \(error.localizedDescription)"
        }
    }

    private func save() async {
        isSaving = true
        rtdb.saveSettings(settings)
        original = settings
        statusMessage = "Saved"
        isSaving = false
        savedToast.flash(seconds: 3)
        RepoFileCleanup.deleteStoredImages(pendingImageDeletions, commitMessage: "Remove replaced/cleared site image")
        pendingImageDeletions = []
    }
}
