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
}
