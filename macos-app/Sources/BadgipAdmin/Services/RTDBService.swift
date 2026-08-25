import FirebaseDatabase
import Foundation

@MainActor
final class RTDBService: ObservableObject {
    private let db = Database.database().reference()

    // MARK: - Projects

    func fetchProjects() async throws -> [Project] {
        let snapshot = try await db.child("projects").getData()
        guard let value = snapshot.value as? [String: [String: Any]] else { return [] }
        return value.map { Project.from(id: $0.key, dict: $0.value) }
            .sorted { $0.order < $1.order }
    }

    /// Returns the project as actually written (id/createdAt/updatedAt
    /// filled in) — callers must persist this back onto their local model.
    /// Returning just the id isn't enough: if createdAt stays 0 locally,
    /// the next save on the same project mistakes it for brand new and
    /// stomps the real creation timestamp.
    @discardableResult
    func saveProject(_ project: Project) throws -> Project {
        var saved = project
        saved.updatedAt = Date().timeIntervalSince1970 * 1000
        if saved.createdAt == 0 {
            saved.createdAt = saved.updatedAt
        }
        saved.id = project.id.isEmpty ? (db.child("projects").childByAutoId().key ?? UUID().uuidString) : project.id
        db.child("projects").child(saved.id).setValue(saved.asDictionary)
        return saved
    }

    func deleteProject(id: String) {
        db.child("projects").child(id).removeValue()
    }

    // MARK: - Settings

    func fetchSettings() async throws -> SiteSettings {
        let snapshot = try await db.child("settings").getData()
        guard let value = snapshot.value as? [String: Any] else { return SiteSettings() }
        return SiteSettings.from(value)
    }

    func saveSettings(_ settings: SiteSettings) {
        db.child("settings").setValue(settings.asDictionary)
    }

    // MARK: - About

    func fetchAbout() async throws -> AboutContent {
        let snapshot = try await db.child("about").getData()
        guard let value = snapshot.value as? [String: Any] else { return AboutContent() }
        return AboutContent.from(value)
    }

    func saveAbout(_ about: AboutContent) {
        db.child("about").setValue(about.asDictionary)
    }

    // MARK: - Personal YouTube

    func fetchYoutubeVideos() async throws -> [YoutubeVideo] {
        let snapshot = try await db.child("personalYoutube").getData()
        guard let value = snapshot.value as? [String: [String: Any]] else { return [] }
        return value.map { YoutubeVideo.from(id: $0.key, dict: $0.value) }
            .sorted { $0.order < $1.order }
    }

    @discardableResult
    func saveYoutubeVideo(_ video: YoutubeVideo) throws -> YoutubeVideo {
        var saved = video
        saved.id = video.id.isEmpty ? (db.child("personalYoutube").childByAutoId().key ?? UUID().uuidString) : video.id
        db.child("personalYoutube").child(saved.id).setValue(saved.asDictionary)
        return saved
    }

    func deleteYoutubeVideo(id: String) {
        db.child("personalYoutube").child(id).removeValue()
    }

    /// Batch-writes just the `order` field for every video passed in — used
    /// after a drag-and-drop reorder.
    func reorderYoutubeVideos(_ videos: [YoutubeVideo]) {
        var updates: [String: Any] = [:]
        for video in videos {
            updates["personalYoutube/\(video.id)/order"] = video.order
        }
        db.updateChildValues(updates)
    }

    // MARK: - Personal Blog

    func fetchBlogPosts() async throws -> [BlogPost] {
        let snapshot = try await db.child("personalBlog").getData()
        guard let value = snapshot.value as? [String: [String: Any]] else { return [] }
        return value.map { BlogPost.from(id: $0.key, dict: $0.value) }
            .sorted { $0.order < $1.order }
    }

    @discardableResult
    func saveBlogPost(_ post: BlogPost) throws -> BlogPost {
        var saved = post
        saved.id = post.id.isEmpty ? (db.child("personalBlog").childByAutoId().key ?? UUID().uuidString) : post.id
        db.child("personalBlog").child(saved.id).setValue(saved.asDictionary)
        return saved
    }

    func deleteBlogPost(id: String) {
        db.child("personalBlog").child(id).removeValue()
    }

    /// Batch-writes just the `order` field for every post passed in — used
    /// after a drag-and-drop reorder.
    func reorderBlogPosts(_ posts: [BlogPost]) {
        var updates: [String: Any] = [:]
        for post in posts {
            updates["personalBlog/\(post.id)/order"] = post.order
        }
        db.updateChildValues(updates)
    }

    // MARK: - Page Sections

    func fetchPageSections() async throws -> [PageSection] {
        let snapshot = try await db.child("pageSections").getData()
        guard let value = snapshot.value as? [String: [String: Any]] else { return [] }
        return value.map { PageSection.from(id: $0.key, dict: $0.value) }
            .sorted { $0.order < $1.order }
    }

    @discardableResult
    func savePageSection(_ section: PageSection) throws -> PageSection {
        var saved = section
        saved.id = section.id.isEmpty ? (db.child("pageSections").childByAutoId().key ?? UUID().uuidString) : section.id
        db.child("pageSections").child(saved.id).setValue(saved.asDictionary)
        return saved
    }

    func deletePageSection(id: String) {
        db.child("pageSections").child(id).removeValue()
    }

    /// Batch-writes just the `order` field for every section passed in —
    /// used after a drag-and-drop reorder so the whole list updates in one
    /// round trip instead of one write per row.
    func reorderPageSections(_ sections: [PageSection]) {
        var updates: [String: Any] = [:]
        for section in sections {
            updates["pageSections/\(section.id)/order"] = section.order
        }
        db.updateChildValues(updates)
    }

    // MARK: - Messages (live)

    private var messagesHandle: DatabaseHandle?

    func observeMessages(onChange: @escaping ([ContactMessage]) -> Void) {
        // Defensive: if a previous observer was never stopped (e.g. a view
        // re-appearing before its own onDisappear fires), remove it first
        // so calling this twice can't silently leak a listener that keeps
        // firing against a stale closure indefinitely.
        stopObservingMessages()
        messagesHandle = db.child("messages").observe(.value) { snapshot in
            guard let value = snapshot.value as? [String: [String: Any]] else {
                onChange([])
                return
            }
            let messages = value.map { ContactMessage.from(id: $0.key, dict: $0.value) }
                .sorted { $0.createdAt > $1.createdAt }
            onChange(messages)
        }
    }

    func stopObservingMessages() {
        if let handle = messagesHandle {
            db.child("messages").removeObserver(withHandle: handle)
            messagesHandle = nil
        }
    }

    func markMessageRead(id: String, read: Bool = true) {
        db.child("messages").child(id).child("read").setValue(read)
    }

    func deleteMessage(id: String) {
        db.child("messages").child(id).removeValue()
    }
}
