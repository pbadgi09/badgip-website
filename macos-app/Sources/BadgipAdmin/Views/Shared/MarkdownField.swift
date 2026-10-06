import SwiftUI

/// A multiline text field with a Write/Preview toggle. Preview renders the
/// same restricted inline-markdown subset the website renders (js/markdown.js)
/// so what the owner sees here matches the live site: bold, italic, code,
/// links, and line breaks. `.inlineOnlyPreservingWhitespace` keeps newlines
/// as line breaks (matching the site's `\n` → `<br>`).
struct MarkdownField: View {
    let label: String
    @Binding var text: String
    @State private var showPreview = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label).font(.caption).foregroundStyle(.secondary)
                Spacer()
                Picker("", selection: $showPreview) {
                    Text("Write").tag(false)
                    Text("Preview").tag(true)
                }
                .pickerStyle(.segmented)
                .labelsHidden()
                .frame(width: 150)
            }

            if showPreview {
                ScrollView {
                    preview
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(10)
                }
                .frame(minHeight: 90, maxHeight: 220)
                .background(RoundedRectangle(cornerRadius: 6).fill(Color.badgipSurface))
                .overlay(RoundedRectangle(cornerRadius: 6).strokeBorder(Color.badgipBorder))
            } else {
                TextEditor(text: $text)
                    .frame(minHeight: 90)
                    .padding(6)
                    .background(RoundedRectangle(cornerRadius: 6).fill(Color.badgipSurface))
                    .overlay(RoundedRectangle(cornerRadius: 6).strokeBorder(Color.badgipBorder))
            }

            Text("Supports **bold**, *italic*, `code`, [links](url), and line breaks.")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
    }

    @ViewBuilder
    private var preview: some View {
        if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            Text("Nothing to preview.").foregroundStyle(.secondary)
        } else if let attributed = try? AttributedString(
            markdown: text,
            options: AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        ) {
            Text(attributed)
        } else {
            Text(text)
        }
    }
}
