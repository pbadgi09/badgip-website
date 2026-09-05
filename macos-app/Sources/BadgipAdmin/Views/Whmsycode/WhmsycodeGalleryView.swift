import SwiftUI

/// A real, repo-wide asset gallery — unlike badgip's own Gallery/
/// ImageReferenceScanner (which only ever look at RTDB data and can never
/// see a file that exists but isn't referenced anywhere), this genuinely
/// lists every image file in the whmsycode.com-website repo via the Git
/// Trees API, then cross-references site.json + apps/manifest.json + every
/// app's content.json to tell used from truly orphaned.
struct WhmsycodeGalleryView: View {
    let service: WhmsycodeGitHubService

    @State private var groups: [(folder: String, entries: [GalleryEntry])] = []
    @State private var isLoading = true
    @State private var loadError: String?
    @State private var actionError: String?
    @State private var pendingDelete: GalleryEntry?

    private let columns = [GridItem(.adaptive(minimum: 120, maximum: 140), spacing: 12)]

    struct GalleryEntry: Identifiable {
        let path: String // repo-relative, no leading slash
        var id: String { path }
        let size: Int?
        let usedBy: [String]
        var isUsed: Bool { !usedBy.isEmpty }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Gallery").font(.title2.weight(.bold))
                Spacer()
                Button("Refresh") { Task { await load() } }.buttonStyle(.badgipSecondary)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 12)

            if let actionError {
                Text(actionError)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 8)
            }

            Group {
                if isLoading {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let loadError {
                    VStack(spacing: 10) {
                        Image(systemName: "exclamationmark.triangle").font(.system(size: 32)).foregroundStyle(.secondary)
                        Text(loadError).foregroundStyle(.secondary).font(.callout).multilineTextAlignment(.center)
                        Button("Retry") { Task { await load() } }.buttonStyle(.badgipSecondary)
                    }
                    .padding(24)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if groups.isEmpty {
                    Text("No images found in the repo.")
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 24) {
                            ForEach(groups, id: \.folder) { group in
                                VStack(alignment: .leading, spacing: 10) {
                                    Text(group.folder)
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(.secondary)
                                    LazyVGrid(columns: columns, spacing: 16) {
                                        ForEach(group.entries) { entry in
                                            GalleryTile(entry: entry, service: service) {
                                                pendingDelete = entry
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        .padding(24)
                    }
                }
            }
        }
        .alert(
            pendingDelete.map { $0.isUsed ? "Still in use — delete anyway?" : "Delete this image?" } ?? "",
            isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })
        ) {
            Button("Cancel", role: .cancel) { pendingDelete = nil }
            Button("Delete", role: .destructive) {
                if let entry = pendingDelete { Task { await delete(entry) } }
                pendingDelete = nil
            }
        } message: {
            if let entry = pendingDelete, entry.isUsed {
                Text("This is still referenced by: \(entry.usedBy.joined(separator: ", ")). Deleting it will break those. This can't be undone.")
            } else {
                Text("This can't be undone.")
            }
        }
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        loadError = nil
        do {
            let tree = try await service.fetchTree()
            let imagePaths = tree.filter { $0.isImage }
            let usage = try await buildUsageMap()

            let entries = imagePaths.map { entry in
                GalleryEntry(path: entry.path, size: entry.size, usedBy: usage[entry.path] ?? [])
            }
            let grouped = Dictionary(grouping: entries) { entry -> String in
                let components = entry.path.split(separator: "/")
                return components.count > 1 ? components.dropLast().joined(separator: "/") : "(root)"
            }
            groups = grouped
                .map { (folder: $0.key, entries: $0.value.sorted { $0.path < $1.path }) }
                .sorted { $0.folder < $1.folder }
        } catch {
            loadError = error.localizedDescription
        }
        isLoading = false
    }

    /// Repo-relative path (no leading "/") -> human-readable list of
    /// everywhere it's referenced. A path stored with a leading "/" is
    /// already repo-root-relative; one without is relative to the JSON
    /// file that references it (site.json fields are already repo-root-
    /// relative even without a leading slash; content.json fields are
    /// relative to that app's own folder).
    private func buildUsageMap() async throws -> [String: [String]] {
        var usage: [String: [String]] = [:]
        func record(_ raw: String, basePrefix: String, label: String) {
            guard !raw.isEmpty else { return }
            let normalized = raw.hasPrefix("/") ? String(raw.dropFirst()) : basePrefix + raw
            usage[normalized, default: []].append(label)
        }

        if let site = try? await service.fetchSiteSettings() {
            record(site.heroImage, basePrefix: "", label: "site.json (homepage hero)")
            record(site.favicon, basePrefix: "", label: "site.json (favicon)")
            record(site.ogImage, basePrefix: "", label: "site.json (default og:image)")
            for (index, item) in site.whyUs.enumerated() {
                record(item.icon, basePrefix: "", label: "Homepage Why card \(index + 1)")
            }
        }

        let manifest = (try? await service.fetchManifest()) ?? []
        for app in manifest {
            guard let content = try? await service.fetchAppContent(slug: app.slug) else { continue }
            let prefix = "\(app.slug)/"
            record(content.heroImage, basePrefix: prefix, label: "\(app.slug) content.json (heroImage)")
            record(content.sixteenNineImage, basePrefix: prefix, label: "\(app.slug) content.json (sixteenNineImage)")
            record(content.ogImage, basePrefix: prefix, label: "\(app.slug) content.json (ogImage)")
            for (index, feature) in content.features.enumerated() {
                record(feature.icon, basePrefix: prefix, label: "\(app.slug) feature \(index + 1)")
            }
        }

        return usage
    }

    private func delete(_ entry: GalleryEntry) async {
        actionError = nil
        do {
            try await service.deleteFile(path: entry.path, commitMessage: "Delete unused asset: \(entry.path)")
            groups = groups.map { (folder: $0.folder, entries: $0.entries.filter { $0.path != entry.path }) }
                .filter { !$0.entries.isEmpty }
        } catch {
            actionError = error.localizedDescription
        }
    }
}

private struct GalleryTile: View {
    let entry: WhmsycodeGalleryView.GalleryEntry
    let service: WhmsycodeGitHubService
    let onDelete: () -> Void
    @State private var isHovering = false

    var body: some View {
        VStack(spacing: 6) {
            ZStack(alignment: .topTrailing) {
                AsyncImage(url: rawURL) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fit)
                    case .failure:
                        Image(systemName: "exclamationmark.triangle").foregroundStyle(.secondary)
                    default:
                        ProgressView().controlSize(.small)
                    }
                }
                .frame(width: 108, height: 108)
                .background(RoundedRectangle(cornerRadius: 8).fill(Color.badgipSurfaceHover))
                .clipShape(RoundedRectangle(cornerRadius: 8))

                Text(entry.isUsed ? "Used" : "Unused")
                    .font(.caption2.weight(.semibold))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Capsule().fill(entry.isUsed ? Color.badgipAccent.opacity(0.85) : Color.orange.opacity(0.85)))
                    .foregroundStyle(.black)
                    .padding(4)

                if isHovering {
                    Button(action: onDelete) {
                        Image(systemName: "trash.circle.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(.white, .red)
                    }
                    .buttonStyle(.plain)
                    .padding(4)
                    .frame(width: 108, height: 108, alignment: .bottomTrailing)
                }
            }
            Text((entry.path as NSString).lastPathComponent)
                .font(.caption2)
                .lineLimit(1)
                .truncationMode(.middle)
                .foregroundStyle(.secondary)
        }
        .onHover { isHovering = $0 }
    }

    private var rawURL: URL? {
        URL(string: "https://raw.githubusercontent.com/\(WhmsycodeGitHubService.owner)/\(WhmsycodeGitHubService.repo)/\(WhmsycodeGitHubService.branch)/\(entry.path)")
    }
}
