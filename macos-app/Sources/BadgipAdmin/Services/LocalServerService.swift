import Darwin
import Foundation
import Swifter

/// Owns the "Server" tab's local companion web server. Phase 1: manual
/// start/stop, one placeholder route, at a fixed port — proves the
/// server-and-webpage pipeline works before any real functionality is
/// mirrored onto it. Swifter's default `start()` (no explicit
/// listenAddressIPv4) binds all interfaces, not just loopback — that's
/// what makes it reachable from another device (e.g. a phone) on the same
/// Wi-Fi via lanURL, not just from this Mac via localURL.
@MainActor
final class LocalServerService: ObservableObject {
    static let port: in_port_t = 8787
    var localURL: URL { URL(string: "http://localhost:\(Self.port)")! }
    /// Reachable from other devices on the same network (a phone, etc.) —
    /// "localhost" only ever means "this device," so a phone needs the
    /// Mac's actual LAN address instead. nil if no active network interface
    /// was found (e.g. Wi-Fi/Ethernet both off).
    var lanURL: URL? {
        guard let ip = Self.lanIPAddress() else { return nil }
        return URL(string: "http://\(ip):\(Self.port)")
    }

    @Published var isRunning = false
    @Published var errorMessage: String?

    private let server = HttpServer()

    func start() {
        guard !isRunning else { return }
        errorMessage = nil
        server["/"] = { _ in .ok(.html(Self.placeholderPage())) }
        do {
            try server.start(Self.port, forceIPv4: true, priority: .userInitiated)
            isRunning = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func stop() {
        server.stop()
        isRunning = false
    }

    // Standard BSD sockets interface enumeration — prefers en0 (the usual
    // Wi-Fi interface on Macs) since that's what a phone on the same Wi-Fi
    // network would need to reach, falling back to the first other
    // non-loopback IPv4 interface (e.g. Ethernet) if Wi-Fi isn't active.
    private static func lanIPAddress() -> String? {
        var ifaddrPtr: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&ifaddrPtr) == 0, let firstAddr = ifaddrPtr else { return nil }
        defer { freeifaddrs(ifaddrPtr) }

        var fallback: String?
        for ptr in sequence(first: firstAddr, next: { $0.pointee.ifa_next }) {
            let interface = ptr.pointee
            guard interface.ifa_addr.pointee.sa_family == UInt8(AF_INET) else { continue }
            let name = String(cString: interface.ifa_name)
            guard name != "lo0" else { continue }

            var hostname = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            let result = getnameinfo(
                interface.ifa_addr, socklen_t(interface.ifa_addr.pointee.sa_len),
                &hostname, socklen_t(hostname.count), nil, 0, NI_NUMERICHOST
            )
            guard result == 0 else { continue }
            let address = String(cString: hostname)

            if name == "en0" { return address }
            if fallback == nil { fallback = address }
        }
        return fallback
    }

    // Includes the current time on every request (rather than a static
    // string) so loading it in a browser is an obvious, visible proof this
    // is a live server response and not a cached file.
    private static func placeholderPage() -> String {
        """
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Badgip Admin — Local Server</title>
            <style>
              body { font-family: -apple-system, sans-serif; background: #0a0a0c; color: #f5f5f5;
                     display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              main { text-align: center; }
              h1 { color: #3effa3; }
            </style>
          </head>
          <body>
            <main>
              <h1>Badgip Admin — local server is running</h1>
              <p>\(Date())</p>
            </main>
          </body>
        </html>
        """
    }
}
