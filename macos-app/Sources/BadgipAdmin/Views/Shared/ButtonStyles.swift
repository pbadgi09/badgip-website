import SwiftUI

/// Pill-shaped, accent-filled primary action button — mirrors the
/// website's .btn--primary so the app and site read as one product.
struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .padding(.horizontal, 18)
            .padding(.vertical, 10)
            .background(Color.badgipAccent)
            .foregroundStyle(.black)
            .clipShape(Capsule())
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

/// Outlined secondary action button — mirrors .btn--ghost.
struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.medium))
            .padding(.horizontal, 16)
            .padding(.vertical, 9)
            .background(
                Capsule().strokeBorder(Color.primary.opacity(0.25), lineWidth: 1)
            )
            .foregroundStyle(.primary)
            .contentShape(Capsule())
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

/// Quiet icon-only button (trash, close, etc.) with a hover-visible
/// circular background instead of the default plain-text look.
struct IconButtonStyle: ButtonStyle {
    var tint: Color = .secondary
    @State private var isHovering = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .medium))
            .foregroundStyle(tint)
            .frame(width: 28, height: 28)
            .background(Circle().fill(isHovering ? tint.opacity(0.15) : .clear))
            .scaleEffect(configuration.isPressed ? 0.9 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
            .onHover { isHovering = $0 }
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var badgipPrimary: PrimaryButtonStyle { PrimaryButtonStyle() }
}

extension ButtonStyle where Self == SecondaryButtonStyle {
    static var badgipSecondary: SecondaryButtonStyle { SecondaryButtonStyle() }
}

extension ButtonStyle where Self == IconButtonStyle {
    static var badgipIcon: IconButtonStyle { IconButtonStyle() }
    static func badgipIcon(tint: Color) -> IconButtonStyle { IconButtonStyle(tint: tint) }
}
