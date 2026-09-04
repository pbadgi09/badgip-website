import Foundation

/// One entry in whmsycode.com-website's root `apps/manifest.json`, which
/// drives that site's homepage app grid.
struct WhmsycodeManifestEntry: Identifiable, Codable, Equatable {
    var slug: String
    var title: String
    var tagline: String
    var icon: String

    var id: String { slug }

    private enum CodingKeys: String, CodingKey {
        case slug, title, tagline, icon
    }
}
