import SwiftUI

struct SiteSettingsView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @State private var settings = SiteSettings()
    @State private var original = SiteSettings()
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var statusMessage: String?

    private var hasChanges: Bool { settings != original }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Site Settings").font(.title.weight(.bold))
                Spacer()
                if let statusMessage {
                    HStack(spacing: 4) {
                        if statusMessage == "Saved" {
                            Image(systemName: "checkmark.circle.fill").foregroundStyle(.badgipAccent)
                        }
                        Text(statusMessage).font(.caption).foregroundStyle(.secondary)
                    }
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

                        EditorCard(title: "Theme") {
                            OptionalColorField(label: "Accent color", hex: $settings.accentColor, fallback: "#3effa3")
                            OptionalColorField(label: "Background color", hex: $settings.backgroundColor, fallback: "#ffffff")
                            OptionalColorField(label: "Text color", hex: $settings.textColor, fallback: "#0a0a0a")
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
                    TextField("Icon (emoji or URL)", text: $item.icon).frame(width: 160).textFieldStyle(.roundedBorder)
                    TextField("Label (e.g. \"42 Berlin St\" or an email)", text: $item.label).textFieldStyle(.roundedBorder)
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
                    TextField("Icon (emoji or URL)", text: $link.icon).frame(width: 160).textFieldStyle(.roundedBorder)
                    TextField("URL", text: $link.url).textFieldStyle(.roundedBorder)
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
    }
}
