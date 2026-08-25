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

    // MARK: - Messages (live)

    private var messagesHandle: DatabaseHandle?

    func observeMessages(onChange: @escaping ([ContactMessage]) -> Void) {
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
