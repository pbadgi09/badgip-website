import SwiftUI

extension Color {
    init?(hex: String) {
        var sanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        sanitized = sanitized.hasPrefix("#") ? String(sanitized.dropFirst()) : sanitized
        guard sanitized.count == 6, let value = UInt32(sanitized, radix: 16) else { return nil }
        let r = Double((value >> 16) & 0xFF) / 255
        let g = Double((value >> 8) & 0xFF) / 255
        let b = Double(value & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }

    /// Best-effort hex string via NSColor's calibrated RGB conversion —
    /// sufficient for the simple accent/background/text swatches this is
    /// used for, not intended as a general-purpose color-space-correct
    /// converter.
    var hexString: String? {
        guard let rgb = NSColor(self).usingColorSpace(.deviceRGB) else { return nil }
        let r = Int((rgb.redComponent * 255).rounded())
        let g = Int((rgb.greenComponent * 255).rounded())
        let b = Int((rgb.blueComponent * 255).rounded())
        return String(format: "#%02x%02x%02x", r, g, b)
    }

    /// The website's brand accent green (--color-accent in css/variables.css)
    /// — ties the admin app's visual identity to the site it manages.
    static let badgipAccent = Color(hex: "#3effa3") ?? .green

    /// Card/field/row background — a subtle tint over the system background,
    /// mirroring the website's --color-bg-elevated. Built on `.primary` (not
    /// a fixed hex) so it adapts correctly in both light and dark automatically.
    static var badgipSurface: Color { Color.primary.opacity(0.04) }
    static var badgipSurfaceHover: Color { Color.primary.opacity(0.07) }

    /// Hairline border for cards/fields, mirroring --color-border.
    static var badgipBorder: Color { Color.primary.opacity(0.1) }
}

// Enables the `.badgipAccent` dot-shorthand in `some ShapeStyle` contexts
// (.foregroundStyle(), .fill()), not just where a literal Color is expected.
extension ShapeStyle where Self == Color {
    static var badgipAccent: Color { Color.badgipAccent }
}
