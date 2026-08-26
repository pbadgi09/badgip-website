import Foundation

/// Keeps `about.personalTimeline` in sync with a blog post's "Show on
/// Timeline" toggle (see `TimelineEntry.blogRef` / `BlogPost.showOnTimeline`).
/// The Blog editor is the *only* thing that ever adds or removes a
/// blog-linked timeline entry — the About editor's timeline list can
/// reorder one but never deletes it, so there's exactly one source of
/// truth for membership.
@MainActor
enum TimelineSync {
    /// Call after saving a blog post. Adds a pointer entry if the post is
    /// now flagged and doesn't have one yet; removes it if the post isn't
    /// (or is no longer) flagged. Fetch-mutate-save against the whole
    /// `about` blob, same pattern AboutEditorView's own Save already uses.
    static func syncPersonalTimelinePointer(for post: BlogPost, rtdb: RTDBService) async {
        guard !post.id.isEmpty else { return }
        do {
            var about = try await rtdb.fetchAbout()
            let hasPointer = about.personalTimeline.contains { $0.blogRef == post.id }
            if post.showOnTimeline && !hasPointer {
                about.personalTimeline.append(TimelineEntry(blogRef: post.id))
                rtdb.saveAbout(about)
            } else if !post.showOnTimeline && hasPointer {
                about.personalTimeline.removeAll { $0.blogRef == post.id }
                rtdb.saveAbout(about)
            }
        } catch {
            print("TimelineSync: failed to sync pointer for post \(post.id): \(error.localizedDescription)")
        }
    }

    /// Call when a blog post is deleted outright, regardless of its
    /// showOnTimeline flag at the time — defensive, so a flagged post being
    /// deleted can never leave a dangling pointer on the timeline.
    static func removePersonalTimelinePointer(forPostId postId: String, rtdb: RTDBService) async {
        do {
            var about = try await rtdb.fetchAbout()
            guard about.personalTimeline.contains(where: { $0.blogRef == postId }) else { return }
            about.personalTimeline.removeAll { $0.blogRef == postId }
            rtdb.saveAbout(about)
        } catch {
            print("TimelineSync: failed to remove pointer for post \(postId): \(error.localizedDescription)")
        }
    }
}
