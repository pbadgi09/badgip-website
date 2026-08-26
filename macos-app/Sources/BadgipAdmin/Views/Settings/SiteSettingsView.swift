import SwiftUI

struct SiteSettingsView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @State private var settings = SiteSettings()
    @State private var original = SiteSettings()
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var statusMessage: String?
    @StateObject private var savedToast = SavedToastController()

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
                            LabeledField(label: "Primary CTA link", text: $settings.ctaPrimaryHref)
                            LabeledField(label: "Secondary CTA text", text: $settings.ctaSecondaryText)
                            LabeledField(label: "Secondary CTA link", text: $settings.ctaSecondaryHref)
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
                                commitMessage: { "Set hero profile picture: \($0)" }
                            )
                        }

                        EditorCard(title: "Social") {
                            LabeledField(label: "GitHub URL", text: $settings.github)
                            LabeledField(label: "LinkedIn URL", text: $settings.linkedin)
                            LabeledField(label: "Twitter/X URL", text: $settings.twitter)
                            LabeledField(label: "Email", text: $settings.email)
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
                        }

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
                                commitMessage: { "Set contact background photo: \($0)" }
                            )
                        }

                        EditorCard(title: "Contact — info rows (address, phone, email, ...)") {
                            contactInfoItemsEditor
                        }

                        EditorCard(title: "Contact — social icons") {
                            contactSocialLinksEditor
                        }
                    }
                    .padding(24)
                }
            }
        }
        .task { await load() }
    }

    @ViewBuilder
    private var contactInfoItemsEditor: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach($settings.contactInfoItems) { $item in
                HStack {
                    TextField("Icon (emoji or URL)", text: $item.icon).frame(width: 160).textFieldStyle(.badgip)
                    TextField("Label (e.g. \"42 Berlin St\" or an email)", text: $item.label).textFieldStyle(.badgip)
                    Button {
                        settings.contactInfoItems.removeAll { $0.id == item.id }
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
                HStack {
                    TextField("Icon (emoji or URL)", text: $link.icon).frame(width: 160).textFieldStyle(.badgip)
                    TextField("URL", text: $link.url).textFieldStyle(.badgip)
                    Button {
                        settings.contactSocialLinks.removeAll { $0.id == link.id }
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
            if settings.navItems.isEmpty {
                settings.navItems = [
                    NavItem(label: "Home", href: "#home", number: "00"),
                    NavItem(label: "About", href: "#about", number: "01"),
                    NavItem(label: "Projects", href: "#projects", number: "02"),
                    NavItem(label: "Contact", href: "#contact", number: "03"),
                ]
            }
            original = settings
        } catch {
            statusMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func save() async {
        isSaving = true
        rtdb.saveSettings(settings)
        original = settings
        statusMessage = "Saved"
        isSaving = false
        savedToast.flash(seconds: 3)
    }
}
