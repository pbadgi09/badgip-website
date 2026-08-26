import SwiftUI

/// The rounded, softly-bordered card used to group related fields in every
/// editor screen — shared so every editor (Projects, Blog, YouTube,
/// Sections, About, Settings) reads as one consistent, native-feeling app
/// instead of a mix of plain Form rows and custom cards.
struct EditorCard<Content: View>: View {
    let title: String
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title).font(.headline.weight(.semibold))
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 12).fill(Color.badgipSurface))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color.badgipBorder, lineWidth: 1))
    }
}

/// A soft-filled, rounded field matching the website's own `.form-field`
/// inputs — used in place of the system-default `.roundedBorder` style so
/// text fields read consistently with the rest of the app's pill/card
/// language instead of standing out as a plain macOS form control.
struct BadgipTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .textFieldStyle(.plain)
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(RoundedRectangle(cornerRadius: 8).fill(Color.badgipSurface))
            .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(Color.badgipBorder, lineWidth: 1))
    }
}

extension TextFieldStyle where Self == BadgipTextFieldStyle {
    static var badgip: BadgipTextFieldStyle { BadgipTextFieldStyle() }
}

/// A labeled text field — small caption above a styled field, matching
/// SiteSettingsView's look so every text input in the app reads the same way.
struct LabeledField: View {
    let label: String
    @Binding var text: String
    var multiline = false

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            if multiline {
                TextEditor(text: $text)
                    .frame(minHeight: 90)
                    .padding(6)
                    .background(RoundedRectangle(cornerRadius: 6).fill(Color.badgipSurface))
                    .overlay(RoundedRectangle(cornerRadius: 6).strokeBorder(Color.badgipBorder))
            } else {
                TextField(label, text: $text).textFieldStyle(.badgip)
            }
        }
    }
}

/// The site's small set of reliable, always-present anchors — matches
/// index.html's fixed section ids (see js/smooth-scroll.js's
/// resolveScrollTarget, which also handles About's real id being
/// mode-suffixed at runtime). Anything else — an external URL, mailto:, a
/// specific custom section — goes through .custom's free-text field.
private enum BuiltInLink: String, CaseIterable, Identifiable {
    case home = "#home"
    case about = "#about"
    case projects = "#projects"
    case contact = "#contact"
    case custom = ""

    var id: String { rawValue }

    var label: String {
        switch self {
        case .home: return "Home"
        case .about: return "About"
        case .projects: return "Projects"
        case .contact: return "Contact"
        case .custom: return "Custom…"
        }
    }
}

/// A CTA/link field styled as a dropdown of the site's known-good anchors
/// instead of free text — avoids a typo'd "#projcets" silently producing a
/// dead button. Falls back to a plain text field (via the "Custom…" choice)
/// for anything not in that fixed set, so nothing is actually more
/// restrictive than before, just harder to get wrong for the common case.
struct LinkField: View {
    let label: String
    @Binding var text: String

    private var selectedOption: BuiltInLink { BuiltInLink(rawValue: text) ?? .custom }

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            Picker(
                "",
                selection: Binding(
                    get: { selectedOption },
                    set: { newOption in
                        // Only stomp the current text when actually leaving
                        // a built-in value for .custom — otherwise picking
                        // .custom while already on a custom string would
                        // wipe out what's already there.
                        if newOption != .custom {
                            text = newOption.rawValue
                        } else if selectedOption != .custom {
                            text = ""
                        }
                    }
                )
            ) {
                ForEach(BuiltInLink.allCases) { option in
                    Text(option.label).tag(option)
                }
            }
            .labelsHidden()
            .pickerStyle(.menu)

            if selectedOption == .custom {
                TextField("https://\u{2026} or #section or mailto:\u{2026}", text: $text)
                    .textFieldStyle(.badgip)
            }
        }
    }
}

/// An icon field that supports emoji, a pasted URL, OR a real upload — the
/// text field stays (an emoji is a completely valid, common choice here),
/// but a picker button next to it removes the need to hand-type a repo
/// path for the upload case. Shared by CustomSectionEditView's item icons
/// and SiteSettingsView's contact info/social icons so the same easy
/// upload-or-type behavior is consistent everywhere an icon is edited.
struct IconPickerField: View {
    @Binding var icon: String
    var placeholder: String = "Icon (emoji, URL, or upload \u{2192})"
    var maxDimension: CGFloat = 800
    var repoPath: (String) -> String
    var storedPath: (String) -> String
    var commitMessage: (String) -> String
    /// Fires with the old path when an upload replaces an existing one —
    /// same deferred-deletion contract as SingleImageUploadView's
    /// onReplaced: the caller decides whether/when to actually delete it
    /// (typically queuing it until its own save() commits), since this
    /// field is used inside deliberate-Save screens.
    var onReplaced: ((String) -> Void)? = nil

    @State private var isUploading = false
    @State private var uploadError: String?
    @State private var isPickingFile = false

    private let githubService = GitHubService()

    private var isImagePath: Bool { RepoFileCleanup.isInternalImagePath(icon) || isExternalImageURL }

    private var isExternalImageURL: Bool {
        let lowered = icon.lowercased()
        guard lowered.hasPrefix("http://") || lowered.hasPrefix("https://") else { return false }
        return [".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"].contains { lowered.hasSuffix($0) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                iconPreview
                TextField(placeholder, text: $icon).textFieldStyle(.badgip)
                Button {
                    isPickingFile = true
                } label: {
                    if isUploading {
                        ProgressView().controlSize(.small)
                    } else {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
                .buttonStyle(.badgipIcon)
                .disabled(isUploading)
            }
            if let uploadError {
                Text(uploadError).font(.caption2).foregroundStyle(.red)
            }
        }
        .fileImporter(isPresented: $isPickingFile, allowedContentTypes: [.image]) { result in
            handlePicked(result)
        }
    }

    @ViewBuilder
    private var iconPreview: some View {
        Group {
            if icon.isEmpty {
                RoundedRectangle(cornerRadius: 6).fill(Color.badgipSurfaceHover)
            } else if isImagePath, let url = resolvedURL {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fit).padding(3)
                    case .failure:
                        Image(systemName: "exclamationmark.triangle").foregroundStyle(.secondary)
                    default:
                        ProgressView().controlSize(.small)
                    }
                }
            } else {
                Text(icon).font(.title3)
            }
        }
        .frame(width: 32, height: 32)
        .background(RoundedRectangle(cornerRadius: 6).fill(Color.badgipSurfaceHover))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    private var resolvedURL: URL? {
        if isExternalImageURL { return URL(string: icon) }
        return JsDelivrService.composeURL(forStoredPath: icon)
    }

    private func handlePicked(_ result: Result<URL, Error>) {
        switch result {
        case .failure(let error):
            uploadError = error.localizedDescription
        case .success(let url):
            Task { await upload(from: url) }
        }
    }

    private func upload(from url: URL) async {
        isUploading = true
        uploadError = nil
        defer { isUploading = false }

        guard url.startAccessingSecurityScopedResource() else {
            uploadError = "Couldn't access the selected file."
            return
        }
        defer { url.stopAccessingSecurityScopedResource() }

        do {
            let rawData = try Data(contentsOf: url)
            let data = ImageCompressor.compress(rawData, maxDimension: maxDimension)
            let filename = url.lastPathComponent
            let repo = repoPath(filename)
            let stored = storedPath(filename)
            let previousIcon = icon

            try await githubService.uploadFile(path: repo, data: data, commitMessage: commitMessage(filename))
            await JsDelivrService.purge(repoPath: repo)
            icon = stored
            if previousIcon != stored, RepoFileCleanup.isInternalImagePath(previousIcon) {
                onReplaced?(previousIcon)
            }
        } catch {
            uploadError = error.localizedDescription
        }
    }
}

/// Standard editor-sheet chrome: title, Cancel/Save actions, a divider, and
/// a scrolling body — every "edit this thing" sheet in the app uses this so
/// they all size and scroll the same way instead of growing past the
/// screen edge (a plain Form with only a minHeight has no ceiling, so long
/// content just pushes the window off-screen instead of scrolling).
struct EditorSheet<Content: View>: View {
    let title: String
    var isSaving: Bool
    var canSave: Bool
    // Defaults to true (always confirm) so a caller that forgets to pass
    // this explicitly fails safe rather than silently discarding edits.
    var hasChanges: Bool = true
    var onCancel: () -> Void
    var onSave: () -> Void
    @ViewBuilder var content: () -> Content

    @State private var showDiscardConfirm = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text(title).font(.title2.weight(.bold))
                Spacer()
                Button("Cancel") {
                    if hasChanges {
                        showDiscardConfirm = true
                    } else {
                        onCancel()
                    }
                }
                .buttonStyle(.badgipSecondary)
                Button(action: onSave) {
                    if isSaving {
                        ProgressView().controlSize(.small).tint(.black)
                    } else {
                        Text("Save")
                    }
                }
                .buttonStyle(.badgipPrimary)
                .disabled(isSaving || !canSave)
            }
            .padding(20)

            Divider()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    content()
                }
                .padding(20)
            }
        }
        .frame(width: 640, height: 720)
        .alert("Discard changes?", isPresented: $showDiscardConfirm) {
            Button("Discard", role: .destructive, action: onCancel)
            Button("Keep Editing", role: .cancel) {}
        } message: {
            Text("You have unsaved changes that will be lost.")
        }
    }
}
