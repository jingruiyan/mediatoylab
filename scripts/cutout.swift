// Cut an object out of its photo and place it on a clean white canvas,
// like a catalog shot. Uses Apple Vision's foreground mask (macOS 14+).
//
// Usage: swift scripts/cutout.swift [--whole] <input image> <output.jpg>
// --whole skips the mask and places the full photo on the canvas, for photos
// where the mask drops part of the object.
// Exits non-zero if no foreground object is found; the caller keeps the original.

import AppKit
import CoreImage
import Vision

var args = CommandLine.arguments
let whole = args.contains("--whole")
args.removeAll { $0 == "--whole" }
guard args.count == 3 else {
    FileHandle.standardError.write("usage: cutout.swift [--whole] <input> <output.jpg>\n".data(using: .utf8)!)
    exit(2)
}
let inputURL = URL(fileURLWithPath: args[1])
let outputURL = URL(fileURLWithPath: args[2])

let canvasW: CGFloat = 1500, canvasH: CGFloat = 1000  // 3:2, matches the site's image frames
let padding: CGFloat = 0.08                             // margin around the object, as a share of the canvas

guard let source = CIImage(contentsOf: inputURL, options: [.applyOrientationProperty: true]) else {
    FileHandle.standardError.write("cannot read \(inputURL.path)\n".data(using: .utf8)!)
    exit(1)
}

// Returns the photo with its background turned white, and the object's bounding box.
func cutOut(_ source: CIImage) throws -> (CIImage, CGRect) {
    let request = VNGenerateForegroundInstanceMaskRequest()
    let handler = VNImageRequestHandler(ciImage: source)
    do { try handler.perform([request]) } catch {
        FileHandle.standardError.write("vision failed: \(error)\n".data(using: .utf8)!)
        exit(1)
    }
    guard let result = request.results?.first, !result.allInstances.isEmpty else {
        FileHandle.standardError.write("no foreground found in \(inputURL.lastPathComponent)\n".data(using: .utf8)!)
        exit(3)
    }

    // All detected instances together: a toy plus its box or accessories stay in the shot.
    let maskBuffer = try result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
    let mask = CIImage(cvPixelBuffer: maskBuffer)

    let white = CIImage(color: .white).cropped(to: source.extent)
    let blend = CIFilter(name: "CIBlendWithMask")!
    blend.setValue(source, forKey: kCIInputImageKey)
    blend.setValue(white, forKey: kCIInputBackgroundImageKey)
    blend.setValue(mask, forKey: kCIInputMaskImageKey)
    let composited = blend.outputImage!

    // Bounding box of the mask, so the object can be cropped and centered.
    let ctx = CIContext()
    guard let maskCG = ctx.createCGImage(mask, from: mask.extent) else { exit(1) }
    let w = maskCG.width, h = maskCG.height
    var gray = [UInt8](repeating: 0, count: w * h)
    let graySpace = CGColorSpaceCreateDeviceGray()
    let bctx = CGContext(data: &gray, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w,
                         space: graySpace, bitmapInfo: CGImageAlphaInfo.none.rawValue)!
    bctx.draw(maskCG, in: CGRect(x: 0, y: 0, width: w, height: h))
    var minX = w, minY = h, maxX = -1, maxY = -1
    for y in 0..<h {
        for x in 0..<w where gray[y * w + x] > 40 {
            minX = min(minX, x); maxX = max(maxX, x)
            minY = min(minY, y); maxY = max(maxY, y)
        }
    }
    guard maxX > minX, maxY > minY else { exit(3) }
    // gray rows run top-down; CIImage coordinates run bottom-up.
    let box = CGRect(x: CGFloat(minX), y: CGFloat(h - 1 - maxY),
                     width: CGFloat(maxX - minX + 1), height: CGFloat(maxY - minY + 1))
    return (composited, box)
}

let ctx = CIContext()
let (composited, box) = whole ? (source, source.extent) : try cutOut(source)

let object = composited.cropped(to: box)
let availW = canvasW * (1 - 2 * padding), availH = canvasH * (1 - 2 * padding)
let scale = min(availW / box.width, availH / box.height)
let placed = object
    .transformed(by: CGAffineTransform(translationX: -box.minX, y: -box.minY))
    .transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    .transformed(by: CGAffineTransform(translationX: (canvasW - box.width * scale) / 2,
                                       y: (canvasH - box.height * scale) / 2))
let canvas = placed.composited(over: CIImage(color: .white).cropped(to: CGRect(x: 0, y: 0, width: canvasW, height: canvasH)))

let srgb = CGColorSpace(name: CGColorSpace.sRGB)!
try ctx.writeJPEGRepresentation(of: canvas, to: outputURL, colorSpace: srgb,
                                options: [kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: 0.85])
