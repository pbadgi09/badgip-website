import AppKit

/// Downscales oversized images and re-encodes them before they get
/// committed to the repo — content photos picked straight from a phone/
/// camera routinely land at several MB and 4000px+, which is wasted
/// bandwidth for anything rendered on a web page. Runs synchronously on a
/// background thread; callers already run their upload flow inside a Task.
enum ImageCompressor {
    /// Longest-edge cap used unless a call site asks for something smaller
    /// (e.g. small icons/logos, which pass a tighter limit).
    static let defaultMaxDimension: CGFloat = 2000

    /// Returns re-encoded image data, or the original `data` unchanged if
    /// it can't be decoded, is already smaller than the target, or
    /// compression would somehow produce a larger file than the source.
    static func compress(_ data: Data, maxDimension: CGFloat = defaultMaxDimension, jpegQuality: CGFloat = 0.82) -> Data {
        guard let bitmap = NSBitmapImageRep(data: data) else { return data }

        let originalWidth = CGFloat(bitmap.pixelsWide)
        let originalHeight = CGFloat(bitmap.pixelsHigh)
        guard originalWidth > 0, originalHeight > 0 else { return data }

        let scale = min(1, maxDimension / max(originalWidth, originalHeight))
        let targetWidth = max(1, (originalWidth * scale).rounded())
        let targetHeight = max(1, (originalHeight * scale).rounded())

        // A transparent PNG (an icon/logo, typically) needs to stay a PNG —
        // re-encoding as JPEG would fill transparent pixels with a solid
        // background and visibly break it. Detect real alpha usage rather
        // than just "has an alpha channel" (most PNGs report one even when
        // every pixel is fully opaque).
        let hasRealTransparency = bitmap.hasAlpha && containsTransparentPixel(bitmap)

        // Nothing to do: already within bounds and we'd only be
        // transcoding losslessly for no size benefit.
        if scale == 1, !hasRealTransparency {
            return data
        }

        guard let resized = resizedBitmap(from: bitmap, width: Int(targetWidth), height: Int(targetHeight)) else {
            return data
        }

        let encoded: Data?
        if hasRealTransparency {
            encoded = resized.representation(using: .png, properties: [:])
        } else {
            encoded = resized.representation(using: .jpeg, properties: [.compressionFactor: jpegQuality])
        }

        guard let encoded, encoded.count < data.count else { return data }
        return encoded
    }

    private static func containsTransparentPixel(_ bitmap: NSBitmapImageRep) -> Bool {
        // Sampling a grid instead of every pixel — this only needs to
        // decide "does this image meaningfully use transparency", not
        // produce an exact count, and a full per-pixel scan on a large
        // source image before it's even been resized would be needlessly
        // slow.
        let stepX = max(1, bitmap.pixelsWide / 40)
        let stepY = max(1, bitmap.pixelsHigh / 40)
        var y = 0
        while y < bitmap.pixelsHigh {
            var x = 0
            while x < bitmap.pixelsWide {
                if let color = bitmap.colorAt(x: x, y: y), color.alphaComponent < 0.98 {
                    return true
                }
                x += stepX
            }
            y += stepY
        }
        return false
    }

    private static func resizedBitmap(from source: NSBitmapImageRep, width: Int, height: Int) -> NSBitmapImageRep? {
        guard let destination = NSBitmapImageRep(
            bitmapDataPlanes: nil,
            pixelsWide: width,
            pixelsHigh: height,
            bitsPerSample: 8,
            samplesPerPixel: 4,
            hasAlpha: true,
            isPlanar: false,
            colorSpaceName: .deviceRGB,
            bytesPerRow: 0,
            bitsPerPixel: 0
        ) else { return nil }

        NSGraphicsContext.saveGraphicsState()
        defer { NSGraphicsContext.restoreGraphicsState() }
        guard let graphicsContext = NSGraphicsContext(bitmapImageRep: destination) else { return nil }
        NSGraphicsContext.current = graphicsContext
        graphicsContext.imageInterpolation = .high
        source.draw(in: NSRect(x: 0, y: 0, width: width, height: height))

        return destination
    }
}
