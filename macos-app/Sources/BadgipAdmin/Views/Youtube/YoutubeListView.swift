import SwiftUI

struct YoutubeListView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @State private var videos: [YoutubeVideo] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var editingVideo: YoutubeVideo?
    @State private var pendingDelete: YoutubeVideo?
    @StateObject private var savedToast = SavedToastController()

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("YouTube").font(.title.weight(.bold))
                Spacer()
                Button {
                    editingVideo = YoutubeVideo(id: "", order: videos.count)
                } label: {
                    Label("New Video", systemImage: "plus")
                }
                .buttonStyle(.badgipPrimary)
            }
            .padding(24)

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red).font(.caption).padding(.horizontal, 24)
            }

            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if videos.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "play.rectangle")
                        .font(.system(size: 40))
                        .foregroundStyle(.tertiary)
                    Text("No videos yet — add your first one.")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                Text("Capped to the first 10 on the site — drag rows to reorder.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 8)
                List {
                    ForEach(videos) { video in
                        YoutubeRow(
                            video: video,
                            onEdit: { editingVideo = video },
                            onDelete: { pendingDelete = video }
                        )
                    }
                    .onMove(perform: move)
                }
                .listStyle(.plain)
            }
        }
        .savedToast(savedToast)
        .sheet(item: $editingVideo) { video in
            YoutubeEditView(video: video) { saved in
                if let index = videos.firstIndex(where: { $0.id == saved.id }) {
                    videos[index] = saved
                } else {
                    videos.append(saved)
                }
                editingVideo = nil
            }
        }
        .alert(
            "Delete \"\(pendingDelete?.title ?? "")\"?",
            isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })
        ) {
            Button("Cancel", role: .cancel) { pendingDelete = nil }
            Button("Delete", role: .destructive) {
                if let video = pendingDelete {
                    rtdb.deleteYoutubeVideo(id: video.id)
                    videos.removeAll { $0.id == video.id }
                    savedToast.flash()
                }
                pendingDelete = nil
            }
        } message: {
            Text("This removes it from the live site immediately and can't be undone.")
        }
        .task { await loadVideos() }
    }

    private func move(from source: IndexSet, to destination: Int) {
        videos.move(fromOffsets: source, toOffset: destination)
        for index in videos.indices { videos[index].order = index }
        rtdb.reorderYoutubeVideos(videos)
        savedToast.flash()
    }

    private func loadVideos() async {
        isLoading = true
        do {
            videos = try await rtdb.fetchYoutubeVideos()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

private struct YoutubeRow: View {
    let video: YoutubeVideo
    let onEdit: () -> Void
    let onDelete: () -> Void
    @State private var isHovering = false

    private var videoId: String? {
        guard let regex = try? NSRegularExpression(pattern: "(?:youtu\\.be/|v=|embed/)([a-zA-Z0-9_-]{11})") else { return nil }
        let range = NSRange(video.url.startIndex..., in: video.url)
        guard let match = regex.firstMatch(in: video.url, range: range), let group = Range(match.range(at: 1), in: video.url) else {
            return nil
        }
        return String(video.url[group])
    }

    var body: some View {
        HStack(spacing: 14) {
            AsyncImage(url: videoId.flatMap { URL(string: "https://img.youtube.com/vi/\($0)/hqdefault.jpg") }) { phase in
                if let image = phase.image {
                    image.resizable().aspectRatio(contentMode: .fill)
                } else {
                    Rectangle().fill(Color.badgipSurfaceHover)
                }
            }
            .frame(width: 80, height: 45)
            .clipShape(RoundedRectangle(cornerRadius: 6))

            VStack(alignment: .leading, spacing: 4) {
                Text(video.title.isEmpty ? "Untitled" : video.title).font(.headline.weight(.semibold))
                Text(video.url).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer()
            Button("Edit", action: onEdit)
                .buttonStyle(.badgipSecondary)
            Button {
                onDelete()
            } label: {
                Image(systemName: "trash")
            }
            .buttonStyle(.badgipIcon(tint: .red))
            Image(systemName: "line.3.horizontal")
                .foregroundStyle(.tertiary)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(isHovering ? Color.badgipSurfaceHover : Color.badgipSurface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color.badgipBorder, lineWidth: 1)
        )
        .onHover { isHovering = $0 }
        .animation(.easeOut(duration: 0.15), value: isHovering)
    }
}

private struct YoutubeEditView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @Environment(\.dismiss) private var dismiss

    @State var video: YoutubeVideo
    var onSave: (YoutubeVideo) -> Void

    @State private var original: YoutubeVideo
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(video: YoutubeVideo, onSave: @escaping (YoutubeVideo) -> Void) {
        _video = State(initialValue: video)
        _original = State(initialValue: video)
        self.onSave = onSave
    }

    private var hasChanges: Bool { video != original }

    var body: some View {
        EditorSheet(
            title: video.id.isEmpty ? "New Video" : "Edit Video",
            isSaving: isSaving,
            canSave: !video.url.isEmpty && hasChanges,
            hasChanges: hasChanges,
            onCancel: { dismiss() },
            onSave: { Task { await save() } }
        ) {
            EditorCard(title: "Video") {
                LabeledField(label: "YouTube URL", text: $video.url)
                LabeledField(label: "Title", text: $video.title)
            }

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red).font(.caption)
            }
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            video = try rtdb.saveYoutubeVideo(video)
            original = video
            onSave(video)
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}
