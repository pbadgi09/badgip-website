import SwiftUI

struct ProjectEditView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @Environment(\.dismiss) private var dismiss

    @State var project: Project
    var existingSlugs: Set<String> = []
    var onSave: (Project) -> Void

    @State private var original: Project
    @State private var tagsText: String = ""
    @State private var isSaving = false
    @State private var errorMessage: String?
    // This sheet only persists on Save (Cancel discards) — see
    // ImageUploadView's onImageRemoved doc comment.
    @State private var pendingImageDeletions: [String] = []

    init(project: Project, existingSlugs: Set<String> = [], onSave: @escaping (Project) -> Void) {
        _project = State(initialValue: project)
        _original = State(initialValue: project)
        self.existingSlugs = existingSlugs
        self.onSave = onSave
    }

    private var hasChanges: Bool { project != original }

    // MARK: - Validation
    private var trimmedSlug: String { project.slug.trimmingCharacters(in: .whitespaces) }
    private var isPublished: Bool { project.status == "published" }
    private var slugFormatInvalid: Bool { !trimmedSlug.isEmpty && !SlugUtil.isValid(trimmedSlug) }
    private var slugDuplicate: Bool { !trimmedSlug.isEmpty && existingSlugs.contains(trimmedSlug) }
    private var hasCarousel: Bool { project.tiles.contains { $0.type == "carousel" && !$0.images.isEmpty } }

    private var publishBlockers: [String] {
        guard isPublished else { return [] }
        var b: [String] = []
        if project.title.isEmpty { b.append("a title") }
        if trimmedSlug.isEmpty { b.append("a slug") }
        if project.coverImage.isEmpty && !hasCarousel { b.append("a cover image or a carousel tile") }
        return b
    }

    private var validationErrors: [String] {
        var e: [String] = []
        if slugFormatInvalid { e.append("Slug must be lowercase letters, numbers and hyphens only.") }
        if slugDuplicate { e.append("Another project already uses this slug.") }
        if !publishBlockers.isEmpty { e.append("To publish, add " + publishBlockers.joined(separator: ", ") + ".") }
        return e
    }

    private var slugChangeWarning: String? {
        guard !project.id.isEmpty, original.status == "published", trimmedSlug != original.slug.trimmingCharacters(in: .whitespaces) else { return nil }
        return "Changing the slug of a published project breaks existing links to it."
    }

    private var linkWarnings: [String] {
        func looksValid(_ href: String) -> Bool {
            href.hasPrefix("#") || href.hasPrefix("http://") || href.hasPrefix("https://") || href.hasPrefix("mailto:")
        }
        return project.ctas
            .filter { !$0.href.isEmpty && !looksValid($0.href) }
            .map { "CTA \u{201c}\($0.text.isEmpty ? $0.href : $0.text)\u{201d} has an unusual link — use #section, http(s)://, or mailto:." }
    }

    var body: some View {
        EditorSheet(
            title: project.id.isEmpty ? "New Project" : "Edit Project",
            isSaving: isSaving,
            canSave: !project.title.isEmpty && hasChanges && validationErrors.isEmpty,
            hasChanges: hasChanges,
            onCancel: { dismiss() },
            onSave: { Task { await save() } }
        ) {
            EditorCard(title: "Basics") {
                LabeledField(label: "Title", text: $project.title)
                    .onChange(of: project.title) { newValue in
                        // Auto-fill the slug from the title until the user
                        // types their own — never overwrites an existing slug.
                        if project.slug.isEmpty { project.slug = SlugUtil.normalize(newValue) }
                    }
                LabeledField(label: "Slug", text: $project.slug)
                if slugFormatInvalid || slugDuplicate {
                    Text(slugDuplicate ? "Another project already uses this slug." : "Use lowercase letters, numbers and hyphens only.")
                        .font(.caption).foregroundStyle(.red)
                } else if let slugChangeWarning {
                    Text(slugChangeWarning).font(.caption).foregroundStyle(.orange)
                }
                LabeledField(label: "Summary", text: $project.summary)
                LabeledField(label: "Tags (comma separated)", text: $tagsText)
                    .onChange(of: tagsText) { newValue in
                        project.tags = newValue.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
                    }
            }

            if !publishBlockers.isEmpty {
                Text("To publish, add " + publishBlockers.joined(separator: ", ") + ".")
                    .font(.caption).foregroundStyle(.orange)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            ForEach(linkWarnings, id: \.self) { warning in
                Text(warning).font(.caption).foregroundStyle(.orange)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            EditorCard(title: "Description") {
                LabeledField(label: "Description", text: $project.description, multiline: true)
            }

            EditorCard(title: "Media") {
                Text("Cover: 16:10 works best. Full-screen hero: 21:9 (a wide, short crop) works best.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                ImageUploadView(project: $project, onImageRemoved: { pendingImageDeletions.append($0) })
                LabeledField(label: "YouTube URL (optional)", text: $project.youtubeUrl)
            }

            EditorCard(title: "Look (optional — overrides the site default for this project's detail view)", collapsible: true, initiallyExpanded: false) {
                OptionalColorField(label: "Accent color", hex: $project.accentColor, fallback: "#3effa3")
                OptionalColorField(label: "Text color", hex: $project.textColor, fallback: "#0a0a0a")
                titleFontSizeControl
            }

            EditorCard(title: "Links") {
                LabeledField(label: "Live URL", text: $project.liveUrl)
                LabeledField(label: "Live Site button label (optional, defaults to \"Live Site\")", text: $project.liveButtonLabel)
                LabeledField(label: "Repo URL", text: $project.repoUrl)
            }

            EditorCard(title: "Detail layout — left column", collapsible: true, initiallyExpanded: false) {
                Text("Powers the new two-column detail view. Leave a field blank to fall back to the matching Basics field (title / summary / description).")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                LabeledField(label: "Hero title (multiline allowed)", text: $project.heroTitle, multiline: true)
                LabeledField(label: "Subtitle", text: $project.subtitle)
                MarkdownField(label: "Caption", text: $project.caption)
                Divider()
                Text("Call-to-action buttons")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                CTAListEditor(ctas: $project.ctas)
            }

            EditorCard(title: "Detail layout — mosaic tiles", collapsible: true, initiallyExpanded: false) {
                Text("The right-column Pinterest-style grid. Reorder with the up/down arrows. Tiles with no explicit content fall back from the project's cover/gallery, video, and tags. Turn on \"Full-width\" to make a tile span both columns.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                TileListEditor(
                    tiles: $project.tiles,
                    slug: project.slug,
                    onImageRemoved: { pendingImageDeletions.append($0) }
                )
            }

            EditorCard(title: "Publishing") {
                Picker("Status", selection: $project.status) {
                    Text("Draft").tag("draft")
                    Text("Published").tag("published")
                }
                .pickerStyle(.segmented)
                .frame(maxWidth: 260)
                Picker("Category", selection: $project.category) {
                    Text("Professional").tag("professional")
                    Text("Personal").tag("personal")
                }
                .pickerStyle(.segmented)
                .frame(maxWidth: 260)
                Toggle("Featured", isOn: $project.featured)
                Text("Featured projects fill the site's first 6 slots (2 rows) before the rest are hidden behind \"Show More.\" Drag rows on the Projects list to reorder.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red).font(.caption)
            }
        }
        .onAppear { tagsText = project.tags.joined(separator: ", ") }
    }

    // Same "0 = use the site default" convention as About's bio font size
    // control (AboutEditorView.fontSizeControl).
    @ViewBuilder
    private var titleFontSizeControl: some View {
        HStack(spacing: 10) {
            Text("Title chip font size").font(.caption).foregroundStyle(.secondary)
            Stepper(
                project.titleFontSize > 0 ? "\(project.titleFontSize)px" : "Default",
                value: $project.titleFontSize,
                in: 0...96,
                step: 2
            )
            .frame(width: 140)
            if project.titleFontSize > 0 {
                Button("Reset") { project.titleFontSize = 0 }
                    .buttonStyle(.badgipSecondary)
                    .controlSize(.small)
            }
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            project = try rtdb.saveProject(project)
            original = project
            onSave(project)
            RepoFileCleanup.deleteStoredImages(pendingImageDeletions, commitMessage: "Remove replaced/cleared image for project \(project.slug)")
            pendingImageDeletions = []
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}

// MARK: - Detail-layout editors

/// Reorderable stack of mosaic tiles. Uses explicit move-up/down controls
/// (rather than a nested List) so variable-height tile editors lay out
/// cleanly inside the editor sheet's own scroll view on macOS 12.
private struct TileListEditor: View {
    @Binding var tiles: [ProjectTile]
    let slug: String
    var onImageRemoved: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach($tiles) { $tile in
                TileRowEditor(
                    tile: $tile,
                    slug: slug,
                    canMoveUp: (tiles.firstIndex { $0.id == tile.id } ?? 0) > 0,
                    canMoveDown: (tiles.firstIndex { $0.id == tile.id } ?? 0) < tiles.count - 1,
                    onMoveUp: { move(id: tile.id, by: -1) },
                    onMoveDown: { move(id: tile.id, by: 1) },
                    onDelete: { tiles.removeAll { $0.id == tile.id } },
                    onImageRemoved: onImageRemoved
                )
            }
            Menu("Add Tile") {
                Button("Text") { tiles.append(ProjectTile(type: "text")) }
                Button("Image") { tiles.append(ProjectTile(type: "image")) }
                Button("Text + Image") { tiles.append(ProjectTile(type: "both")) }
                Button("Project image carousel") { tiles.append(ProjectTile(type: "carousel")) }
                Button("YouTube video") { tiles.append(ProjectTile(type: "video")) }
                Button("Tags") { tiles.append(ProjectTile(type: "tags")) }
            }
            .buttonStyle(.badgipSecondary)
            .controlSize(.small)
            .fixedSize()
        }
    }

    private func move(id: String, by offset: Int) {
        guard let i = tiles.firstIndex(where: { $0.id == id }) else { return }
        let j = i + offset
        guard j >= 0, j < tiles.count else { return }
        tiles.swapAt(i, j)
    }
}

private struct TileRowEditor: View {
    @Binding var tile: ProjectTile
    let slug: String
    let canMoveUp: Bool
    let canMoveDown: Bool
    var onMoveUp: () -> Void
    var onMoveDown: () -> Void
    var onDelete: () -> Void
    var onImageRemoved: (String) -> Void

    private var isTextBearing: Bool { tile.type == "text" || tile.type == "both" }
    private var isImageBearing: Bool { tile.type == "image" || tile.type == "both" }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Picker("", selection: $tile.type) {
                    Text("Text").tag("text")
                    Text("Image").tag("image")
                    Text("Text + Image").tag("both")
                    Text("Project carousel").tag("carousel")
                    Text("YouTube video").tag("video")
                    Text("Tags").tag("tags")
                }
                .labelsHidden()
                .frame(width: 170)
                Spacer()
                Button(action: onMoveUp) { Image(systemName: "chevron.up") }
                    .buttonStyle(.plain).disabled(!canMoveUp)
                Button(action: onMoveDown) { Image(systemName: "chevron.down") }
                    .buttonStyle(.plain).disabled(!canMoveDown)
                Button(action: onDelete) { Image(systemName: "trash") }
                    .buttonStyle(.plain).foregroundStyle(.secondary)
            }

            content

            Toggle("Full-width (spans both columns)", isOn: $tile.fullWidth)
            LabeledField(label: "Link URL (optional — makes the tile clickable)", text: $tile.href)
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 8).fill(Color.badgipSurface))
        .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(Color.badgipBorder))
    }

    @ViewBuilder
    private var content: some View {
        switch tile.type {
        case "carousel":
            Text("Swipeable carousel of project images (dots shown automatically).")
                .font(.caption).foregroundStyle(.secondary)
            ImageArrayField(
                paths: $tile.images,
                repoPath: { ImagePathBuilder.repoPath(slug: slug, filename: $0) },
                storedPath: { ImagePathBuilder.storedPath(slug: slug, filename: $0) },
                commitMessage: { "Add carousel image for project \(slug): \($0)" },
                onImageRemoved: onImageRemoved
            )
        case "video":
            LabeledField(label: "YouTube URL", text: $tile.videoUrl)
        case "tags":
            Text("Renders this project's tag chips (edit tags under Basics).")
                .font(.caption).foregroundStyle(.secondary)
        default:
            if isImageBearing {
                SingleImageUploadView(
                    path: $tile.image,
                    buttonLabel: "Set Tile Image",
                    repoPath: { ImagePathBuilder.repoPath(slug: slug, filename: $0) },
                    storedPath: { ImagePathBuilder.storedPath(slug: slug, filename: $0) },
                    commitMessage: { "Add tile image for project \(slug): \($0)" },
                    onReplaced: { onImageRemoved($0) }
                )
                Picker("Image fit", selection: $tile.imageFit) {
                    Text("Cover (crop to fill)").tag("cover")
                    Text("Contain (show whole image)").tag("contain")
                }
                .frame(maxWidth: 300)
            }
            if isTextBearing {
                LabeledField(label: "Text", text: $tile.text, multiline: true)
                OptionalColorField(label: "Text color", hex: $tile.textColor, fallback: "#f5f5f5")
                tileFontSizeControl
                Picker("Text align", selection: $tile.textAlign) {
                    Text("Left").tag("left")
                    Text("Center").tag("center")
                    Text("Right").tag("right")
                }
                .pickerStyle(.segmented)
                .frame(maxWidth: 240)
                HighlightsEditor(label: "Highlighted keywords", keywords: $tile.highlights)
            }
            OptionalColorField(label: "Background", hex: $tile.bgColor, fallback: "#11141a")
        }
    }

    @ViewBuilder
    private var tileFontSizeControl: some View {
        HStack(spacing: 10) {
            Text("Text font size").font(.caption).foregroundStyle(.secondary)
            Stepper(
                tile.fontSize > 0 ? "\(tile.fontSize)px" : "Default",
                value: $tile.fontSize,
                in: 0...96,
                step: 2
            )
            .frame(width: 140)
            if tile.fontSize > 0 {
                Button("Reset") { tile.fontSize = 0 }
                    .buttonStyle(.badgipSecondary)
                    .controlSize(.small)
            }
        }
    }
}
