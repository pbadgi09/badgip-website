import SwiftUI

/// Lets the user reuse an image already committed anywhere in the repo,
/// instead of uploading a duplicate. Unlike badgip's own ExistingImagePicker
/// (which only surfaces images already referenced in RTDB — see
/// ImageReferenceScanner), this genuinely lists every image file in the
/// repo via the Git Trees API, since whmsycode has no database to scan.
/// Hands back an absolute, root-relative path (leading "/") so the picked
/// image resolves correctly regardless of which page ends up using it.
struct WhmsycodeExistingImagePicker: View {
    let service: WhmsycodeGitHubService
    var onPick: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    // Grouped by folder — several apps commonly have identically-named
    // files (icon.png, hero.jpg), so a flat grid with just a bare filename
    // underneath each thumbnail would make two different images
    // indistinguishable at a glance.
    @State private var groups: [(folder: String, entries: [WhmsycodeTreeEntry])] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    private let columns = [GridItem(.adaptive(minimum: 96, maximum: 96), spacing: 12)]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Choose an existing image").font(.title2.weight(.bold))
                Spacer()
                Button("Cancel") { dismiss() }.buttonStyle(.badgipSecondary)
            }
            .padding(20)
            Divider()

            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let errorMessage {
                VStack(spacing: 10) {
                    Text(errorMessage).foregroundStyle(.secondary).multilineTextAlignment(.center)
                    Button("Retry") { Task { await load() } }.buttonStyle(.badgipSecondary)
                }
                .padding(24)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if groups.isEmpty {
                Text("No images in the repo yet — upload one first.")
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        ForEach(groups, id: \.folder) { group in
                            VStack(alignment: .leading, spacing: 8) {
                                Text(group.folder)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                LazyVGrid(columns: columns, spacing: 16) {
                                    ForEach(group.entries, id: \.path) { entry in
                                        Button {
                                            onPick("/\(entry.path)")
                                            dismiss()
                                        } label: {
                                            VStack(spacing: 4) {
                                                AsyncImage(url: rawURL(for: entry.path)) { phase in
                                                    switch phase {
                                                    case .success(let image):
                                                        image.resizable().aspectRatio(contentMode: .fit)
                                                    case .failure:
                                                        Image(systemName: "exclamationmark.triangle").foregroundStyle(.secondary)
                                                    default:
                                                        ProgressView().controlSize(.small)
                                                    }
                                                }
                                                .frame(width: 84, height: 84)
                                                .background(RoundedRectangle(cornerRadius: 8).fill(Color.badgipSurfaceHover))
                                                .clipShape(RoundedRectangle(cornerRadius: 8))

                                                Text((entry.path as NSString).lastPathComponent)
                                                    .font(.caption2)
                                                    .lineLimit(1)
                                                    .truncationMode(.middle)
                                                    .foregroundStyle(.secondary)
                                            }
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                        }
                    }
                    .padding(20)
                }
            }
        }
        .frame(width: 560, height: 480)
        .task { await load() }
    }

    private func rawURL(for path: String) -> URL? {
        URL(string: "https://raw.githubusercontent.com/\(WhmsycodeGitHubService.owner)/\(WhmsycodeGitHubService.repo)/\(WhmsycodeGitHubService.branch)/\(path)")
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        do {
            let images = try await service.fetchTree().filter { $0.isImage }
            let grouped = Dictionary(grouping: images) { entry -> String in
                let components = entry.path.split(separator: "/")
                return components.count > 1 ? components.dropLast().joined(separator: "/") : "(root)"
            }
            groups = grouped
                .map { (folder: $0.key, entries: $0.value.sorted { $0.path < $1.path }) }
                .sorted { $0.folder < $1.folder }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
