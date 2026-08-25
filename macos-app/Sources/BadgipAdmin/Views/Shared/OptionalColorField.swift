import SwiftUI

/// A color field for an optional per-item override — empty string means
/// "use the site default". Shows the fallback color while empty, and a
/// Reset button appears once a custom value is picked.
struct OptionalColorField: View {
    let label: String
    @Binding var hex: String
    let fallback: String

    var body: some View {
        HStack {
            Text(label).frame(width: 110, alignment: .leading)
            ColorPicker(
                "",
                selection: Binding(
                    get: { Color(hex: hex.isEmpty ? fallback : hex) ?? .gray },
                    set: { newColor in
                        if let converted = newColor.hexString {
                            hex = converted
                        }
                    }
                )
            )
            .labelsHidden()
            Text(hex.isEmpty ? "Using site default" : hex)
                .font(.caption)
                .foregroundStyle(.secondary)
            if !hex.isEmpty {
                Button("Reset") { hex = "" }
                    .buttonStyle(.badgipSecondary)
                    .controlSize(.small)
            }
        }
    }
}
