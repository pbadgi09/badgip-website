import SwiftUI

/// The rounded, softly-bordered card used to group related fields in every
/// editor screen — shared so every editor (Projects, Blog, YouTube,
/// Sections, About, Settings) reads as one consistent, native-feeling app
/// instead of a mix of plain Form rows and custom cards.
struct EditorCard<Content: View>: View {
    let title: String
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title).font(.headline.weight(.semibold))
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 12).fill(Color.badgipSurface))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color.badgipBorder, lineWidth: 1))
    }
}

/// A soft-filled, rounded field matching the website's own `.form-field`
/// inputs — used in place of the system-default `.roundedBorder` style so
/// text fields read consistently with the rest of the app's pill/card
/// language instead of standing out as a plain macOS form control.
struct BadgipTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .textFieldStyle(.plain)
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(RoundedRectangle(cornerRadius: 8).fill(Color.badgipSurface))
            .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(Color.badgipBorder, lineWidth: 1))
    }
}

extension TextFieldStyle where Self == BadgipTextFieldStyle {
    static var badgip: BadgipTextFieldStyle { BadgipTextFieldStyle() }
}

/// A labeled text field — small caption above a styled field, matching
/// SiteSettingsView's look so every text input in the app reads the same way.
struct LabeledField: View {
    let label: String
    @Binding var text: String
    var multiline = false

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            if multiline {
                TextEditor(text: $text)
                    .frame(minHeight: 90)
                    .padding(6)
                    .background(RoundedRectangle(cornerRadius: 6).fill(Color.badgipSurface))
                    .overlay(RoundedRectangle(cornerRadius: 6).strokeBorder(Color.badgipBorder))
            } else {
                TextField(label, text: $text).textFieldStyle(.badgip)
            }
        }
    }
}

/// Standard editor-sheet chrome: title, Cancel/Save actions, a divider, and
/// a scrolling body — every "edit this thing" sheet in the app uses this so
/// they all size and scroll the same way instead of growing past the
/// screen edge (a plain Form with only a minHeight has no ceiling, so long
/// content just pushes the window off-screen instead of scrolling).
struct EditorSheet<Content: View>: View {
    let title: String
    var isSaving: Bool
    var canSave: Bool
    var onCancel: () -> Void
    var onSave: () -> Void
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text(title).font(.title2.weight(.bold))
                Spacer()
                Button("Cancel", action: onCancel).buttonStyle(.badgipSecondary)
                Button(action: onSave) {
                    if isSaving {
                        ProgressView().controlSize(.small).tint(.black)
                    } else {
                        Text("Save")
                    }
                }
                .buttonStyle(.badgipPrimary)
                .disabled(isSaving || !canSave)
            }
            .padding(20)

            Divider()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    content()
                }
                .padding(20)
            }
        }
        .frame(width: 640, height: 720)
    }
}
