import Foundation

enum ImagePathBuilder {
    /// Builds a consistent `assets/projects/<slug>/<filename>` path used both
    /// for the GitHub commit and the value stored in the project's RTDB record.
    static func projectImagePath(slug: String, filename: String) -> String {
        let safeSlug = slug.isEmpty ? "untitled" : slug
        return "assets/projects/\(safeSlug)/\(filename)"
    }
}
