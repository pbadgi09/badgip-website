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
            // Without this check, a slug that collides with an existing app
            // (or a typo that happens to match one) would silently overwrite
            // its index.html/content.json/images with a blank scaffold —
            // this has to happen before any uploadFile call, not after.
            let existingManifest = try await service.fetchManifest()
            guard !existingManifest.contains(where: { $0.slug == slug }) else {
                errorMessage = "An app with slug \"\(slug)\" already exists — choose a different slug."
                isCreating = false
                return
            }

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

            var manifest = existingManifest
            let entry = WhmsycodeManifestEntry(slug: slug, title: title, tagline: tagline, icon: String(title.prefix(2)).uppercased())
            manifest.append(entry)
            try await service.saveManifest(manifest, commitMessage: "Add \(title) to apps manifest")

            // Best-effort: sitemap.xml is an SEO nicety, not something a
            // hiccup here should block app creation over (unlike the
            // og:image meta-tag patch in WhmsycodeAppEditorView, which
            // affects what a shared link actually shows and does surface
            // its own errors).
            try? await service.addSitemapEntry(slug: slug)

            onCreate(entry)
        } catch {
            errorMessage = error.localizedDescription
        }
        isCreating = false
    }

    // Matches the site's current hero/nav/footer/animation conventions
    // (squiggle accent, scroll-reveal classes) as of this writing — if the
    // live template's markup conventions evolve further, this should be
    // updated to match so a newly created app doesn't look stale next to
    // hand-built pages.
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
                <a class="nav-brand" href="/"><span data-nav-brand>WHMSYCODE</span></a>
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
                  <svg class="squiggle" width="140" height="70" viewBox="0 0 140 70" style="left:-40px; bottom:-20px;" aria-hidden="true">
                    <path d="M2 40 Q 30 5, 55 35 T 110 30 T 136 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 9"/>
                  </svg>
                  <div class="hero-phone">
                    <img id="hero-phone-img" src="" alt="\(title) app mockup">
                  </div>
                </div>
              </section>
              <section class="container section-media reveal">
                <div class="hero-media-frame">
                  <img id="hero-16x9-img" src="" alt="\(title) screenshot">
                </div>
              </section>
              <section class="container section">
                <h2 class="section-heading reveal">What it does</h2>
                <div class="app-grid" id="features-grid" data-reveal-stagger></div>
              </section>
            </main>
            <footer class="footer container">
              <div class="footer-inner">
                <p class="footer-copy" data-footer-copyright>&copy; 2026 WHMSYCODE. All rights reserved.</p>
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
            import { initScrollReveal } from "/assets/js/animations.js";
            renderApp().then(initScrollReveal);
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
                <a class="nav-brand" href="/"><span data-nav-brand>WHMSYCODE</span></a>
                <div class="nav-links">
                  <a href="index.html">\(title)</a>
                  <a class="btn-primary" href="/#apps">Apps</a>
                </div>
              </nav>
            </header>
            <main class="container content-page">
              <h1>\(heading)</h1>
              <p class="updated" id="legal-updated">Last updated: —</p>
              <div id="legal-sections" class="reveal"></div>
              <h2>Contact</h2>
              <p>Questions? Contact us at <a href="mailto:hello@whmsycode.com" data-support-email data-support-email-text>hello@whmsycode.com</a>.</p>
            </main>
            <footer class="footer container">
              <div class="footer-inner">
                <p class="footer-copy" data-footer-copyright>&copy; 2026 WHMSYCODE. All rights reserved.</p>
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
            import { initScrollReveal } from "/assets/js/animations.js";
            renderLegal("\(kind)").then(initScrollReveal);
          </script>
        </body>
        </html>
        """
    }
}
