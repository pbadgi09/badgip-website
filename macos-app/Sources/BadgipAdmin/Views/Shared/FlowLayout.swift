import SwiftUI

/// Wraps its children onto multiple rows as they run out of horizontal
/// space — a "flow"/tag-cloud layout for things like keyword pills.
///
/// SwiftUI's `Layout` protocol (the modern way to build this) needs macOS
/// 13+; this app targets macOS 12, so wrapping is computed the older way,
/// via `.alignmentGuide` closures that accumulate a running x/y offset as
/// each item is placed — a well-established pre-Layout-protocol pattern.
struct FlowLayout<Data: RandomAccessCollection, Content: View>: View where Data.Element: Identifiable {
    let data: Data
    var spacing: CGFloat = 8
    @ViewBuilder let content: (Data.Element) -> Content

    @State private var totalHeight: CGFloat = 40

    var body: some View {
        GeometryReader { geometry in
            generateContent(in: geometry)
        }
        .frame(height: totalHeight)
    }

    private func generateContent(in geometry: GeometryProxy) -> some View {
        var x: CGFloat = 0
        var y: CGFloat = 0

        return ZStack(alignment: .topLeading) {
            ForEach(Array(data), id: \.id) { item in
                content(item)
                    .padding(.trailing, spacing)
                    .padding(.bottom, spacing)
                    .alignmentGuide(.leading) { dimension in
                        // `x` accumulates more negative as items are placed
                        // along the current row (each returned value is
                        // subtracted from the natural position, so a more
                        // negative running total pushes later items right).
                        // Comparing abs(x - dimension.width) — not x itself
                        // — against the available width is what correctly
                        // detects "would this overflow the row", since x
                        // only ever moves negative and a naive `x + width`
                        // check would stop triggering once x goes negative.
                        if abs(x - dimension.width) > geometry.size.width {
                            x = 0
                            y -= dimension.height
                        }
                        let result = x
                        x -= dimension.width
                        return result
                    }
                    .alignmentGuide(.top) { _ in
                        y
                    }
            }
        }
        .background(
            GeometryReader { fullGeometry in
                Color.clear.onAppear {
                    totalHeight = fullGeometry.size.height
                }
                // .onChange isn't needed for size changes here — this view
                // is always rebuilt when `data` changes (it's an Identity
                // input to the parent), which re-runs generateContent and
                // re-reads this GeometryReader's height on next layout pass.
            }
        )
    }
}
