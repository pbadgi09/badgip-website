import Foundation

/// Mirrors whmsycode.com-website's root `site.json` 1:1 — the site-wide
/// chrome (nav brand, footer, default support email) plus the homepage hero,
/// shared by every page via `content.js`'s `renderSiteChrome()`.
struct WhmsycodeSiteSettings: Codable, Equatable {
    var navBrand: String = "WHMSYCODE"
    var footerCopyright: String = ""
    var supportEmail: String = ""
    var hero: WhmsycodeHomepageHero = WhmsycodeHomepageHero()
    var heroImage: String = ""
    var favicon: String = ""
    var ogImage: String = ""
}

struct WhmsycodeHomepageHero: Codable, Equatable {
    var eyebrow: String = ""
    var headlineLine1: String = ""
    var headlineLine2: String = ""
    var subtitle: String = ""
}
