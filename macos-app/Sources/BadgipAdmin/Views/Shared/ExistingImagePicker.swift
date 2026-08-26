import SwiftUI

/// A sheet for reusing an image already committed somewhere on the site,
/// instead of uploading a new (possibly duplicate) file. Presented from
/// every image-upload point in the app via a "Choose Existing Image…" menu
/// item next to "Upload New Image…".
struct ExistingImagePicker: View {
    @Environment(\.dismiss) private var dismiss
    var onPick: (String) -> Void

    @State private var references: [ImageReference] = []
    @State private var isLoading = true

    private let columns = [GridItem(.adaptive(minimum: 140), spacing: 16)]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Choose an Existing Image").font(.title2.weight(.bold))
                Spacer()
                Button("Cancel") { dismiss() }.buttonStyle(.badgipSecondary)
            }
            .padding(20)

            Divider()

            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if references.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "photo.on.rectangle.angled")
                        .font(.system(size: 40))
                        .foregroundStyle(.tertiary)
                    Text("No images anywhere on the site yet — upload one first.")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 16) {
                        ForEach(references) { ref in
                            Button {
                                onPick(ref.path)
                                dismiss()
                            } label: {
                                VStack(alignment: .leading, spacing: 6) {
                                    thumbnail(for: ref.path)
                                    Text(ref.label)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(2)
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(20)
                }
            }
        }
        .frame(width: 560, height: 480)
        .task {
            references = (await ImageReferenceScanner.scanAll()).sorted { $0.label < $1.label }
            isLoading = false
        }
    }

    @ViewBuilder
    private func thumbnail(for path: String) -> some View {
        Group {
            if let url = JsDelivrService.composeURL(forStoredPath: path) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    case .failure:
                        Image(systemName: "exclamationmark.triangle").foregroundStyle(.secondary)
                    default:
                        ProgressView().controlSize(.small)
                    }
                }
            } else {
                Image(systemName: "photo").foregroundStyle(.secondary)
            }
        }
        .frame(height: 100)
        .frame(maxWidth: .infinity)
        .background(Color.badgipSurfaceHover)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(Color.badgipBorder))
    }
}
