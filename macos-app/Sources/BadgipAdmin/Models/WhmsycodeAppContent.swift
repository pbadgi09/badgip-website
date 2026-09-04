import Foundation

/// Mirrors a whmsycode.com app page's `content.json` 1:1. Unlike the
/// RTDB-backed models (Project, AboutContent, ...), this maps directly to a
/// real JSON file rather than a Firebase snapshot, so it's plain Codable —
/// no asDictionary/from(id:dict:) needed.
struct WhmsycodeAppContent: Codable, Equatable {
    var title: String = ""
    var eyebrow: String = ""
    var heroTitleLine1: String = ""
    var heroTitleLine2: String = ""
    var subtitle: String = ""
    var appStoreUrl: String = ""
    var googlePlayUrl: String = ""
    var heroImage: String = ""
    var sixteenNineImage: String = ""
    var features: [WhmsycodeFeature] = []
    var supportEmail: String = ""
    var terms: WhmsycodeLegalDocument = WhmsycodeLegalDocument()
    var privacy: WhmsycodeLegalDocument = WhmsycodeLegalDocument()
}
