import SwiftUI

struct WhmsycodeNewAppView: View {
    let service: WhmsycodeGitHubService
    var onCreate: (WhmsycodeManifestEntry) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var slug = ""
    @State private var tagline = ""
    @State private var isCreating = false
    @State private var errorMessage: String?
    // Tracks whether the slug has diverged from title's auto-derived value,
    // so typing more into Title after a manual slug edit doesn't silently
    // stomp it back.
    @State private var userEditedSlug = false

    private var slugIsValid: Bool {
        slug.range(of: "^[a-z0-9]+(-[a-z0-9]+)*$", options: .regularExpression) != nil
    }
    private var canCreate: Bool { !title.isEmpty && slugIsValid && !tagline.isEmpty }

    var body: some View {
        EditorSheet(
            title: "New App",
            isSaving: isCreating,
            canSave: canCreate,
            hasChanges: true,
            onCancel: { dismiss() },
            onSave: { Task { await create() } }
        ) {
            EditorCard(title: "Basics") {
                LabeledField(label: "Title", text: $title)
                    .onChange(of: title) { newValue in
                        if !userEditedSlug {
                            slug = Self.slugify(newValue)
                        }
                    }
                LabeledField(label: "URL slug (whmsycode.com/…)", text: $slug)
                    .onChange(of: slug) { newValue in
                        // A programmatic update from the title handler above
                        // always matches slugify(title) exactly — only a
                        // value that diverges from that means the user
                        // actually typed into this field themselves.
                        if newValue != Self.slugify(title) {
                            userEditedSlug = true
                        }
                    }
                LabeledField(label: "Tagline (shown on the homepage app card)", text: $tagline, multiline: true)
                if !slug.isEmpty, !slugIsValid {
                    Text("Slug must be lowercase letters, numbers, and hyphens only.")
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }
            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red).font(.caption)
            }
        }
    }

    private static func slugify(_ text: String) -> String {
        text.lowercased()
            .replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
    }

    private func create() async {
        isCreating = true
        errorMessage = nil
        do {
            let content = WhmsycodeAppContent(
                title: title,
                eyebrow: title,
                heroTitleLine1: title,
                heroTitleLine2: "",
                subtitle: tagline,
                appStoreUrl: "#",
                googlePlayUrl: "#",
                heroImage: "",
                sixteenNineImage: "",
                features: [],
                supportEmail: "hello@whmsycode.com",
                terms: WhmsycodeLegalDocument(updated: "[PLACEHOLDER DATE]", sections: []),
                privacy: WhmsycodeLegalDocument(updated: "[PLACEHOLDER DATE]", sections: [])
            )
            try await service.saveAppContent(content, slug: slug, commitMessage: "Scaffold content.json for \(slug)")

            try await service.uploadFile(
                path: "\(slug)/index.html",
                data: Data(Self.pageShellHTML(title: title).utf8),
                commitMessage: "Scaffold index.html for \(slug)"
            )
            try await service.uploadFile(
                path: "\(slug)/terms.html",
                data: Data(Self.legalShellHTML(title: title, kind: "terms", heading: "Terms of Use").utf8),
                commitMessage: "Scaffold terms.html for \(slug)"
            )
            try await service.uploadFile(
                path: "\(slug)/privacy.html",
                data: Data(Self.legalShellHTML(title: title, kind: "privacy", heading: "Privacy Policy").utf8),
                commitMessage: "Scaffold privacy.html for \(slug)"
            )

            var manifest = try await service.fetchManifest()
            let entry = WhmsycodeManifestEntry(slug: slug, title: title, tagline: tagline, icon: String(title.prefix(2)).uppercased())
            manifest.append(entry)
            try await service.saveManifest(manifest, commitMessage: "Add \(title) to apps manifest")

            onCreate(entry)
        } catch {
            errorMessage = error.localizedDescription
        }
        isCreating = false
    }

    // Minimal generic shell — copy the real hero/nav/footer markup from an
    // existing app page (e.g. editor-compressor/index.html) into this
    // template once the website's layout stabilizes further. Kept
    // deliberately plain here so a new app is immediately functional
    // (loads styles.css + content.js and has every id renderApp() expects)
    // without duplicating the site's full template in Swift source.
    private static func pageShellHTML(title: String) -> String {
        """
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>\(title) | WHMSYCODE</title>
          <link rel="icon" type="image/png" href="/assets/img/favicon.png">
          <link rel="stylesheet" href="/assets/css/styles.css">
        </head>
        <body data-page="app">
          <div class="page-card">
            <header class="container">
              <nav class="nav">
                <a class="nav-brand" href="/">WHMSYCODE</a>
                <div class="nav-links">
                  <a href="/#apps">Apps</a>
                  <a class="btn-primary" id="nav-download" href="#">Download</a>
                </div>
              </nav>
            </header>
            <main>
              <section class="container hero">
                <div class="hero-copy">
                  <p class="hero-eyebrow" id="hero-eyebrow">\(title)</p>
                  <h1 class="hero-title">
                    <span id="hero-title-line1"></span><br>
                    <em id="hero-title-line2"></em>
                  </h1>
                  <p class="hero-subtitle" id="hero-subtitle"></p>
                  <div class="hero-actions">
                    <div class="store-badges">
                      <a class="store-icon" id="store-apple" href="#" aria-label="Download on the App Store"></a>
                      <a class="store-icon" id="store-google" href="#" aria-label="Get it on Google Play"></a>
                    </div>
                  </div>
                </div>
                <div class="hero-media hero-media--phone">
                  <div class="hero-phone">
                    <img id="hero-phone-img" src="" alt="\(title) app mockup">
                  </div>
                </div>
              </section>
              <section class="container section-media">
                <div class="hero-media-frame">
                  <img id="hero-16x9-img" src="" alt="\(title) screenshot">
                </div>
              </section>
              <section class="container section">
                <h2 class="section-heading">What it does</h2>
                <div class="app-grid" id="features-grid"></div>
              </section>
            </main>
            <footer class="footer container">
              <div class="footer-inner">
                <p class="footer-copy">&copy; 2026 WHMSYCODE. All rights reserved.</p>
                <div class="footer-links">
                  <a href="terms.html">Terms of Use</a>
                  <a href="privacy.html">Privacy Policy</a>
                  <a href="mailto:hello@whmsycode.com" data-support-email>Support</a>
                  <a href="/">WHMSYCODE</a>
                </div>
              </div>
            </footer>
          </div>
          <script type="module">
            import { renderApp } from "/assets/js/content.js";
            renderApp();
          </script>
        </body>
        </html>
        """
    }

    private static func legalShellHTML(title: String, kind: String, heading: String) -> String {
        """
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>\(heading) — \(title) | WHMSYCODE</title>
          <meta name="robots" content="noindex">
          <link rel="icon" type="image/png" href="/assets/img/favicon.png">
          <link rel="stylesheet" href="/assets/css/styles.css">
        </head>
        <body>
          <div class="page-card">
            <header class="container">
              <nav class="nav">
                <a class="nav-brand" href="/">WHMSYCODE</a>
                <div class="nav-links">
                  <a href="index.html">\(title)</a>
                  <a class="btn-primary" href="/#apps">Apps</a>
                </div>
              </nav>
            </header>
            <main class="container content-page">
              <h1>\(heading)</h1>
              <p class="updated" id="legal-updated">Last updated: —</p>
              <div id="legal-sections"></div>
              <h2>Contact</h2>
              <p>Questions? Contact us at <a href="mailto:hello@whmsycode.com" data-support-email>hello@whmsycode.com</a>.</p>
            </main>
            <footer class="footer container">
              <div class="footer-inner">
                <p class="footer-copy">&copy; 2026 WHMSYCODE. All rights reserved.</p>
                <div class="footer-links">
                  <a href="terms.html">Terms of Use</a>
                  <a href="privacy.html">Privacy Policy</a>
                  <a href="mailto:hello@whmsycode.com" data-support-email>Support</a>
                </div>
              </div>
            </footer>
          </div>
          <script type="module">
            import { renderLegal } from "/assets/js/content.js";
            renderLegal("\(kind)");
          </script>
        </body>
        </html>
        """
    }
}
