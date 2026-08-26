import AppKit
import SwiftUI

struct ServerView: View {
    @EnvironmentObject private var server: LocalServerService

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Server").font(.title.weight(.bold))
                    Text("Runs a local web server while this app is open, at a fixed address. Phase 1: just a placeholder page to confirm it's reachable — the rest of the app's functionality gets mirrored onto it later.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                EditorCard(title: "Local Server") {
                    HStack(spacing: 8) {
                        Circle()
                            .fill(server.isRunning ? Color.badgipAccent : Color.secondary)
                            .frame(width: 8, height: 8)
                        Text(server.isRunning ? "Running" : "Stopped")
                            .font(.callout)
                    }

                    if server.isRunning {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("On this Mac: \(server.localURL.absoluteString)")
                                .font(.callout.monospaced())
                            if let lanURL = server.lanURL {
                                Text("On your phone/other devices (same Wi-Fi): \(lanURL.absoluteString)")
                                    .font(.callout.monospaced())
                            } else {
                                Text("Couldn't detect a Wi-Fi/network address to share with other devices.")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        // "localhost" only ever means "this device" — a phone
                        // has to use the Mac's actual network address instead.
                        Text("The first time another device connects, macOS may ask whether to let BadgipAdmin accept incoming network connections — click Allow, or the connection will silently fail.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Button(server.isRunning ? "Stop Server" : "Start Server") {
                            if server.isRunning {
                                server.stop()
                            } else {
                                server.start()
                            }
                        }
                        .buttonStyle(.badgipSecondary)

                        Button("Open in Browser") {
                            NSWorkspace.shared.open(server.localURL)
                        }
                        .buttonStyle(.badgipSecondary)
                        .disabled(!server.isRunning)
                    }

                    if let errorMessage = server.errorMessage {
                        Text(errorMessage).font(.caption).foregroundStyle(.red)
                    }
                }
            }
            .padding(24)
        }
    }
}
