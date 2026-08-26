import SwiftUI

/// Wraps its children onto multiple rows as they run out of horizontal
/// space — a "flow"/tag-cloud layout for things like keyword pills.
///
/// SwiftUI's `Layout` protocol (the modern way to build this) needs macOS
/// 13+; this app targets macOS 12. An earlier version of this file used
/// `.alignmentGuide` plus a `.background(GeometryReader { ... })` height
/// measurement to size the container — that measurement never actually
/// worked on this SwiftUI runtime (confirmed by instrumenting it: the
/// `onPreferenceChange`/`onAppear` height callback fired exactly once,
/// with the default value, and never again as items were added). The
/// container's height stayed frozen at the first item's height forever,
/// so every row after the first rendered outside its bounds — which is
/// exactly what "all the pills disappeared after adding a second one"
/// looks like once something else in the layout overlaps that space.
///
/// This version sidesteps runtime measurement entirely: each item's width
/// is estimated up front (synchronous text measurement, not a rendered
/// view size), rows are packed with plain arithmetic, and rendering uses
/// real `VStack`/`HStack` containers — which size themselves to their
/// content automatically, no manual height tracking needed. Verified
/// directly (off-screen NSHostingView render + bitmap capture, since this
/// environment has no interactive GUI access) across 1/2/3/4 items,
/// wrapping to a new row, and removing an item.
struct FlowLayout<Data: RandomAccessCollection, Content: View>: View where Data.Element: Identifiable {
    let data: Data
    var spacing: CGFloat = 8
    /// Estimated rendered width of one item, used only to decide when a
    /// row is full — doesn't need to be pixel-perfect, just close enough
    /// that wrapping decisions land in the right place.
    var itemWidth: (Data.Element) -> CGFloat
    @ViewBuilder let content: (Data.Element) -> Content

    var body: some View {
        GeometryReader { geometry in
            VStack(alignment: .leading, spacing: spacing) {
                ForEach(Array(packRows(containerWidth: geometry.size.width).enumerated()), id: \.offset) { _, row in
                    HStack(spacing: spacing) {
                        ForEach(row) { item in
                            content(item)
                        }
                    }
                }
            }
        }
        // GeometryReader always reports itself as "fill all offered
        // space" to its own parent, regardless of its child's actual
        // size — so it needs an explicit height here, or it expands to
        // fill the rest of the enclosing ScrollView. A flat per-item
        // estimate deliberately overshoots (safe: a little empty space
        // below the pills, never clipping/overlap) rather than trying to
        // predict the real row count, which would need the same
        // containerWidth this frame is computed without.
        .frame(height: CGFloat(max(1, data.count)) * 36, alignment: .top)
    }

    private func packRows(containerWidth: CGFloat) -> [[Data.Element]] {
        var rows: [[Data.Element]] = []
        var currentRow: [Data.Element] = []
        var currentWidth: CGFloat = 0

        for item in data {
            let width = itemWidth(item)
            let neededWidth = currentRow.isEmpty ? width : currentWidth + spacing + width
            if neededWidth > containerWidth, !currentRow.isEmpty {
                rows.append(currentRow)
                currentRow = [item]
                currentWidth = width
            } else {
                currentRow.append(item)
                currentWidth = neededWidth
            }
        }
        if !currentRow.isEmpty { rows.append(currentRow) }
        return rows
    }
}
