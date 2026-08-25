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
                        card(title: "Hero") {
                            field("Greeting", $settings.greeting)
                            field("Name", $settings.name)
                            field("Role", $settings.role)
                            field("Description", $settings.description)
                            field("Primary CTA text", $settings.ctaPrimaryText)
                            field("Primary CTA link", $settings.ctaPrimaryHref)
                            field("Secondary CTA text", $settings.ctaSecondaryText)
                            field("Secondary CTA link", $settings.ctaSecondaryHref)
                        }

                        card(title: "Social") {
                            field("GitHub URL", $settings.github)
                            field("LinkedIn URL", $settings.linkedin)
                            field("Twitter/X URL", $settings.twitter)
                            field("Email", $settings.email)
                        }

                        card(title: "Theme") {
                            colorField("Accent color", hex: $settings.accentColor)
                            colorField("Background color", hex: $settings.backgroundColor)
                            colorField("Text color", hex: $settings.textColor)
                        }

                        card(title: "Meta") {
                            field("Page title", $settings.metaTitle)
                            field("Meta description", $settings.metaDescription)
                        }
                    }
                    .padding(24)
                }
            }
        }
        .task { await load() }
    }

    @ViewBuilder
    private func card(title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.headline.weight(.semibold))
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 12).fill(Color.primary.opacity(0.03)))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color.primary.opacity(0.08), lineWidth: 1))
    }

    @ViewBuilder
    private func field(_ label: String, _ text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            TextField(label, text: text).textFieldStyle(.roundedBorder)
        }
    }

    @ViewBuilder
    private func colorField(_ label: String, hex: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            HStack {
                TextField(label, text: hex).textFieldStyle(.roundedBorder)
                ColorPicker(
                    "",
                    selection: Binding(
                        get: { Color(hex: hex.wrappedValue) ?? .gray },
                        set: { newColor in
                            if let converted = newColor.hexString {
                                hex.wrappedValue = converted
                            }
                        }
                    )
                )
                .labelsHidden()
            }
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
