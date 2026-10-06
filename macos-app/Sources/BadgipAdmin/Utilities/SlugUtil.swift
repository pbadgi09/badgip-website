import Foundation

/// Slug helpers: normalize free text to a URL-safe `[a-z0-9-]` slug (matching
/// how the website keys `#project/<slug>` deep links) and de-duplicate
/// against existing slugs.
enum SlugUtil {
    static func normalize(_ input: String) -> String {
        let mapped = input.lowercased().map { ch -> Character in
            (ch.isASCII && (ch.isLetter || ch.isNumber)) ? ch : "-"
        }
        var result = String(mapped)
        while result.contains("--") { result = result.replacingOccurrences(of: "--", with: "-") }
        return result.trimmingCharacters(in: CharacterSet(charactersIn: "-"))
    }

    static func isValid(_ slug: String) -> Bool {
        !slug.isEmpty && slug == normalize(slug)
    }

    /// Returns `base` if free, else `base-2`, `base-3`, … avoiding `existing`.
    static func unique(_ base: String, existing: Set<String>) -> String {
        let candidate = base.isEmpty ? "untitled" : base
        guard existing.contains(candidate) else { return candidate }
        var n = 2
        while existing.contains("\(candidate)-\(n)") { n += 1 }
        return "\(candidate)-\(n)"
    }
}
