import SwiftUI

struct SiteSettingsView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @State private var settings = SiteSettings()
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var statusMessage: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Site Settings").font(.title2.bold())
                Spacer()
                if let statusMessage {
                    HStack(spacing: 4) {
                        if statusMessage == "Saved" {
                            Image(systemName: "checkmark.circle.fill").foregroundStyle(.badgipAccent)
                        }
                        Text(statusMessage).font(.caption).foregroundStyle(.secondary)
                    }
                }
                Button("Save") { Task { await save() } }
                    .buttonStyle(.borderedProminent)
                    .disabled(isSaving)
            }
            .padding()

            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                Form {
                    Section("Hero") {
                        TextField("Greeting", text: $settings.greeting)
                        TextField("Name", text: $settings.name)
                        TextField("Role", text: $settings.role)
                        TextField("Description", text: $settings.description)
                        TextField("Primary CTA text", text: $settings.ctaPrimaryText)
                        TextField("Primary CTA link", text: $settings.ctaPrimaryHref)
                        TextField("Secondary CTA text", text: $settings.ctaSecondaryText)
                        TextField("Secondary CTA link", text: $settings.ctaSecondaryHref)
                    }

                    Section("Social") {
                        TextField("GitHub URL", text: $settings.github)
                        TextField("LinkedIn URL", text: $settings.linkedin)
                        TextField("Twitter/X URL", text: $settings.twitter)
                        TextField("Email", text: $settings.email)
                    }

                    Section("Theme") {
                        colorField("Accent color", hex: $settings.accentColor)
                        colorField("Background color", hex: $settings.backgroundColor)
                        colorField("Text color", hex: $settings.textColor)
                    }

                    Section("Meta") {
                        TextField("Page title", text: $settings.metaTitle)
                        TextField("Meta description", text: $settings.metaDescription)
                    }
                }
            }
        }
        .task { await load() }
    }

    @ViewBuilder
    private func colorField(_ label: String, hex: Binding<String>) -> some View {
        HStack {
            TextField(label, text: hex)
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
        } catch {
            statusMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func save() async {
        isSaving = true
        rtdb.saveSettings(settings)
        statusMessage = "Saved"
        isSaving = false
    }
}
