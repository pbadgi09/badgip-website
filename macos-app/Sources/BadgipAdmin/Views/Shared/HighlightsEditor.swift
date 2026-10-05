import SwiftUI
import AppKit

/// Reusable "highlighted keywords" editor — a flow-wrapped list of
/// keyword→color pills plus an add field. Mirrors the About bio's editor so
/// the hero subtitle and project mosaic tiles get the exact same control.
/// (AboutEditorView keeps its own private copy; this is the shared one used
/// by the newer editors.)
struct HighlightsEditor: View {
    let label: String
    @Binding var keywords: [HighlightKeyword]
    @State private var draft: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label).font(.caption).foregroundStyle(.secondary)

            if !keywords.isEmpty {
                FlowLayout(data: keywords, spacing: 8, itemWidth: { highlightPillWidth($0.keyword) }) { item in
                    HighlightPill(
                        keyword: item,
                        onColorChange: { newColor in
                            if let index = keywords.firstIndex(where: { $0.id == item.id }) {
                                keywords[index].color = newColor
                            }
                        },
                        onDelete: { keywords.removeAll { $0.id == item.id } }
                    )
                }
            }

            HStack {
                TextField("Add keyword, then press Return", text: $draft)
                    .textFieldStyle(.badgip)
                    .onSubmit { add() }
                Button {
                    add()
                } label: {
                    Label("Add", systemImage: "plus")
                }
                .buttonStyle(.badgipSecondary)
                .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(.top, 4)
    }

    private func add() {
        let trimmed = draft.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        keywords.append(HighlightKeyword(keyword: trimmed))
        draft = ""
    }
}

// Close-enough width estimate for FlowLayout's row-wrap points (10pt
// horizontal padding each side, 14pt swatch, spacing, delete glyph).
private func highlightPillWidth(_ keyword: String) -> CGFloat {
    let textWidth = (keyword as NSString).size(withAttributes: [.font: NSFont.systemFont(ofSize: 13)]).width
    return 20 + 14 + 6 + textWidth + 6 + 15
}

private struct HighlightPill: View {
    let keyword: HighlightKeyword
    let onColorChange: (String) -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(spacing: 6) {
            ZStack {
                Circle()
                    .fill(Color(hex: keyword.color) ?? .badgipAccent)
                    .frame(width: 14, height: 14)
                // Invisible-but-hit-testable ColorPicker over the swatch.
                ColorPicker(
                    "",
                    selection: Binding(
                        get: { Color(hex: keyword.color) ?? .badgipAccent },
                        set: { newColor in
                            if let converted = newColor.hexString { onColorChange(converted) }
                        }
                    )
                )
                .labelsHidden()
                .opacity(0.015)
                .frame(width: 14, height: 14)
            }
            Text(keyword.keyword)
                .font(.callout)
                .lineLimit(1)
            Button(action: onDelete) {
                Image(systemName: "xmark")
                    .font(.system(size: 9, weight: .bold))
                    .padding(3)
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Capsule().fill(Color.badgipSurfaceHover))
        .overlay(Capsule().strokeBorder(Color.badgipBorder))
        .fixedSize()
    }
}
