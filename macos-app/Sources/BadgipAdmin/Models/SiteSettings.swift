import Foundation

struct NavItem: Codable, Equatable {
    var label: String = ""
    var href: String = ""
    var number: String = ""

    var asDictionary: [String: Any] {
        ["label": label, "href": href, "number": number]
    }

    static func from(_ dict: [String: Any]) -> NavItem {
        NavItem(
            label: dict["label"] as? String ?? "",
            href: dict["href"] as? String ?? "",
            number: dict["number"] as? String ?? ""
        )
    }
}

struct ContactInfoItem: Identifiable, Codable, Equatable {
    var id: String = UUID().uuidString
    var icon: String = "" // emoji or an image URL / repo-relative path
    var label: String = ""

    var asDictionary: [String: Any] { ["icon": icon, "label": label] }

    static func from(_ dict: [String: Any]) -> ContactInfoItem {
        ContactInfoItem(icon: dict["icon"] as? String ?? "", label: dict["label"] as? String ?? "")
    }
}

struct ContactSocialLink: Identifiable, Codable, Equatable {
    var id: String = UUID().uuidString
    var icon: String = "" // emoji or an image URL / repo-relative path
    var url: String = ""

    var asDictionary: [String: Any] { ["icon": icon, "url": url] }

    static func from(_ dict: [String: Any]) -> ContactSocialLink {
        ContactSocialLink(icon: dict["icon"] as? String ?? "", url: dict["url"] as? String ?? "")
    }
}

struct SiteSettings: Codable, Equatable {
    // hero
    var greeting: String = "Hello, I'm"
    var name: String = "Pranav Badgi"
    var role: String = "Full Stack Developer"
    var description: String = ""
    var ctaPrimaryText: String = "View My Work"
    var ctaPrimaryHref: String = "#projects"
    var ctaSecondaryText: String = "Get In Touch"
    var ctaSecondaryHref: String = "#contact"
    var profileImage: String = ""

    // nav
    var navItems: [NavItem] = []

    // social (footer links)
    var github: String = ""
    var linkedin: String = ""
    var twitter: String = ""
    var email: String = ""

    // theme
    var accentColor: String = "#3effa3"
    var backgroundColor: String = "#0a0a0a"
    var textColor: String = "#e5e5e5"

    // meta
    var metaTitle: String = ""
    var metaDescription: String = ""
    var ogImage: String = ""

    // contact section (the two-panel "Get in touch" UI)
    var contactHeading: String = "Get in touch"
    var contactSubheading: String = "Any questions or remarks? Just write a message."
    var contactInfoTitle: String = "Contact information"
    var contactInfoSubtitle: String = ""
    var contactBackgroundImage: String = ""
    var contactInfoItems: [ContactInfoItem] = []
    var contactSocialLinks: [ContactSocialLink] = []

    var asDictionary: [String: Any] {
        [
            "hero": [
                "greeting": greeting,
                "name": name,
                "role": role,
                "description": description,
                "ctaPrimaryText": ctaPrimaryText,
                "ctaPrimaryHref": ctaPrimaryHref,
                "ctaSecondaryText": ctaSecondaryText,
                "ctaSecondaryHref": ctaSecondaryHref,
                "profileImage": profileImage,
            ],
            "nav": ["items": navItems.map { $0.asDictionary }],
            "social": ["github": github, "linkedin": linkedin, "twitter": twitter, "email": email],
            "theme": ["accentColor": accentColor, "backgroundColor": backgroundColor, "textColor": textColor],
            "meta": ["title": metaTitle, "description": metaDescription, "ogImage": ogImage],
            "contact": [
                "heading": contactHeading,
                "subheading": contactSubheading,
                "infoTitle": contactInfoTitle,
                "infoSubtitle": contactInfoSubtitle,
                "backgroundImage": contactBackgroundImage,
                "infoItems": contactInfoItems.map { $0.asDictionary },
                "socialLinks": contactSocialLinks.map { $0.asDictionary },
            ],
            "updatedAt": Date().timeIntervalSince1970 * 1000,
        ]
    }

    static func from(_ dict: [String: Any]) -> SiteSettings {
        var settings = SiteSettings()
        if let hero = dict["hero"] as? [String: Any] {
            settings.greeting = hero["greeting"] as? String ?? settings.greeting
            settings.name = hero["name"] as? String ?? settings.name
            settings.role = hero["role"] as? String ?? settings.role
            settings.description = hero["description"] as? String ?? settings.description
            settings.ctaPrimaryText = hero["ctaPrimaryText"] as? String ?? settings.ctaPrimaryText
            settings.ctaPrimaryHref = hero["ctaPrimaryHref"] as? String ?? settings.ctaPrimaryHref
            settings.ctaSecondaryText = hero["ctaSecondaryText"] as? String ?? settings.ctaSecondaryText
            settings.ctaSecondaryHref = hero["ctaSecondaryHref"] as? String ?? settings.ctaSecondaryHref
            settings.profileImage = hero["profileImage"] as? String ?? ""
        }
        if let nav = dict["nav"] as? [String: Any], let items = nav["items"] as? [[String: Any]] {
            settings.navItems = items.map { NavItem.from($0) }
        }
        if let social = dict["social"] as? [String: Any] {
            settings.github = social["github"] as? String ?? ""
            settings.linkedin = social["linkedin"] as? String ?? ""
            settings.twitter = social["twitter"] as? String ?? ""
            settings.email = social["email"] as? String ?? ""
        }
        if let theme = dict["theme"] as? [String: Any] {
            settings.accentColor = theme["accentColor"] as? String ?? settings.accentColor
            settings.backgroundColor = theme["backgroundColor"] as? String ?? settings.backgroundColor
            settings.textColor = theme["textColor"] as? String ?? settings.textColor
        }
        if let meta = dict["meta"] as? [String: Any] {
            settings.metaTitle = meta["title"] as? String ?? ""
            settings.metaDescription = meta["description"] as? String ?? ""
            settings.ogImage = meta["ogImage"] as? String ?? ""
        }
        if let contact = dict["contact"] as? [String: Any] {
            settings.contactHeading = contact["heading"] as? String ?? settings.contactHeading
            settings.contactSubheading = contact["subheading"] as? String ?? settings.contactSubheading
            settings.contactInfoTitle = contact["infoTitle"] as? String ?? settings.contactInfoTitle
            settings.contactInfoSubtitle = contact["infoSubtitle"] as? String ?? settings.contactInfoSubtitle
            settings.contactBackgroundImage = contact["backgroundImage"] as? String ?? ""
            if let items = contact["infoItems"] as? [[String: Any]] {
                settings.contactInfoItems = items.map { ContactInfoItem.from($0) }
            }
            if let links = contact["socialLinks"] as? [[String: Any]] {
                settings.contactSocialLinks = links.map { ContactSocialLink.from($0) }
            }
        }
        return settings
    }
}
