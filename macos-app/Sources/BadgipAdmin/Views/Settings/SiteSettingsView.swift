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
                    }
                    .padding(24)
                }
            }
        }
        .task { await load() }
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
