// swift-tools-version:5.7
import PackageDescription

let package = Package(
    name: "BadgipAdmin",
    platforms: [.macOS(.v12)],
    products: [
        .executable(name: "BadgipAdmin", targets: ["BadgipAdmin"])
    ],
    dependencies: [
        .package(url: "https://github.com/firebase/firebase-ios-sdk", from: "10.29.0"),
        // Pinned: nanopb 2.30910.x declares a macOS 10.15 minimum that conflicts
        // with several firebase-ios-sdk targets still declaring macOS 10.13,
        // breaking the build under Xcode 14.2/Swift tools 5.7. 2.30909.0 (the
        // lowest version firebase-ios-sdk 10.29.0 allows) has no explicit
        // platform floor and resolves cleanly.
        .package(url: "https://github.com/firebase/nanopb.git", exact: "2.30909.0"),
    ],
    targets: [
        .executableTarget(
            name: "BadgipAdmin",
            dependencies: [
                // "FirebaseCore" isn't its own SPM product in this SDK version —
                // it's an internal target pulled in transitively by FirebaseAuth
                // and FirebaseDatabase, and `import FirebaseCore` still resolves.
                .product(name: "FirebaseAuth", package: "firebase-ios-sdk"),
                .product(name: "FirebaseDatabase", package: "firebase-ios-sdk"),
            ],
            path: "Sources/BadgipAdmin",
            exclude: [
                // Not an SPM resource — copied into a real .app bundle's
                // Contents/Info.plist by scripts/build-app.sh instead.
                "Info.plist"
            ],
            resources: [
                .copy("Resources/GoogleService-Info.plist")
            ]
        )
    ]
)
