import SwiftUI
import AppKit

/// Landing dashboard for the itspranavbadgi site: at-a-glance content counts,
/// unread messages, last-updated, and quick actions.
struct OverviewView: View {
    @EnvironmentObject private var rtdb: RTDBService
    var onNavigate: (DashboardSection) -> Void

    @State private var counts = Counts()
    @State private var lastUpdated: Date?
    @State private var isLoading = true
    @State private var editingProject: Project?

    private let liveURL = URL(string: "https://www.itspranavbadgi.com")!

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Overview").font(.title.weight(.bold))

                EditorCard(title: "Content") {
                    if isLoading {
                        ProgressView().frame(maxWidth: .infinity)
                    } else {
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 3), spacing: 12) {
                            statTile("\(counts.projectsPublished)", "Published", systemImage: "folder.fill")
                            statTile("\(counts.projectsDraft)", "Drafts", systemImage: "folder")
                            statTile("\(counts.blog)", "Blog posts", systemImage: "doc.richtext")
                            statTile("\(counts.sections)", "Sections", systemImage: "square.grid.2x2")
                            statTile("\(counts.youtube)", "YouTube", systemImage: "play.rectangle")
                            statTile("\(counts.projectsFeatured)", "Featured", systemImage: "star.fill")
                        }
                    }
                }

                EditorCard(title: "Activity") {
                    HStack {
                        Label("\(rtdb.unreadCount) unread message\(rtdb.unreadCount == 1 ? "" : "s")", systemImage: "envelope.badge")
                            .foregroundStyle(rtdb.unreadCount > 0 ? Color.badgipAccent : .secondary)
                        Spacer()
                        Button("Open Messages") { onNavigate(.messages) }
                            .buttonStyle(.badgipSecondary)
                            .controlSize(.small)
                    }
                    if let lastUpdated {
                        Text("Last project update: \(lastUpdated.formatted(date: .abbreviated, time: .shortened))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                EditorCard(title: "Quick actions") {
                    HStack(spacing: 10) {
                        Button {
                            editingProject = Project(id: "", order: counts.projectsPublished + counts.projectsDraft)
                        } label: {
                            Label("New Project", systemImage: "plus")
                        }
                        .buttonStyle(.badgipPrimary)

                        Button {
                            NSWorkspace.shared.open(liveURL)
                        } label: {
                            Label("Preview site", systemImage: "safari")
                        }
                        .buttonStyle(.badgipSecondary)

                        Spacer()
                    }
                }
            }
            .padding(24)
            .frame(maxWidth: 820, alignment: .leading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .sheet(item: $editingProject) { project in
            ProjectEditView(project: project) { _ in
                editingProject = nil
                Task { await load() }
            }
        }
        .task { await load() }
    }

    @ViewBuilder
    private func statTile(_ value: String, _ label: String, systemImage: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Image(systemName: systemImage).foregroundStyle(.badgipAccent)
            Text(value).font(.title2.weight(.bold))
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 10).fill(Color.badgipSurfaceHover))
    }

    private struct Counts {
        var projectsPublished = 0
        var projectsDraft = 0
        var projectsFeatured = 0
        var blog = 0
        var sections = 0
        var youtube = 0
    }

    private func load() async {
        isLoading = true
        let projects = (try? await rtdb.fetchProjects()) ?? []
        let posts = (try? await rtdb.fetchBlogPosts()) ?? []
        let sections = (try? await rtdb.fetchPageSections()) ?? []
        let videos = (try? await rtdb.fetchYoutubeVideos()) ?? []

        var c = Counts()
        c.projectsPublished = projects.filter { $0.status == "published" }.count
        c.projectsDraft = projects.filter { $0.status != "published" }.count
        c.projectsFeatured = projects.filter { $0.featured }.count
        c.blog = posts.count
        c.sections = sections.count
        c.youtube = videos.count
        counts = c

        let newestMs = projects.map(\.updatedAt).max() ?? 0
        lastUpdated = newestMs > 0 ? Date(timeIntervalSince1970: newestMs / 1000) : nil
        isLoading = false
    }
}
