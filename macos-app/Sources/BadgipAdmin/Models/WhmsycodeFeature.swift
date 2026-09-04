import Foundation

/// One "what it does" feature blurb on a whmsycode.com app page. `id` is
/// local-only (not part of content.json) so SwiftUI list editing has a
/// stable identity without the JSON schema needing an id field.
struct WhmsycodeFeature: Identifiable, Codable, Equatable {
    var id = UUID()
    var icon: String = "spark"
    var title: String = ""
    var description: String = ""

    private enum CodingKeys: String, CodingKey {
        case icon, title, description
    }
}
