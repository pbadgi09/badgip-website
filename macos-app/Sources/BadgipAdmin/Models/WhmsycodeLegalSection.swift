import Foundation

/// One heading+body block of a Terms/Privacy page on whmsycode.com. `id` is
/// local-only, same rationale as WhmsycodeFeature.
struct WhmsycodeLegalSection: Identifiable, Codable, Equatable {
    var id = UUID()
    var heading: String = ""
    var body: String = ""

    private enum CodingKeys: String, CodingKey {
        case heading, body
    }
}

/// A whole legal document (Terms or Privacy) as stored in content.json:
/// a "last updated" string plus an ordered list of sections.
struct WhmsycodeLegalDocument: Codable, Equatable {
    var updated: String = ""
    var sections: [WhmsycodeLegalSection] = []
}
