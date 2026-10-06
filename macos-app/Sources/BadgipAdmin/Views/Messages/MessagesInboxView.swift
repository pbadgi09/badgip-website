import SwiftUI
import AppKit

struct MessagesInboxView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @State private var pendingDelete: ContactMessage?
    @State private var searchText = ""
    @StateObject private var savedToast = SavedToastController()

    private var filtered: [ContactMessage] {
        let q = searchText.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return rtdb.messages }
        return rtdb.messages.filter {
            $0.name.lowercased().contains(q)
                || $0.email.lowercased().contains(q)
                || $0.message.lowercased().contains(q)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Messages").font(.title.weight(.bold))
                if rtdb.unreadCount > 0 {
                    Text("\(rtdb.unreadCount) unread")
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.badgipAccent.opacity(0.15))
                        .foregroundStyle(.badgipAccent)
                        .clipShape(Capsule())
                }
                Spacer()
                if !rtdb.messages.isEmpty {
                    TextField("Search", text: $searchText)
                        .textFieldStyle(.badgip)
                        .frame(width: 220)
                }
            }
            .padding(24)

            if rtdb.messages.isEmpty {
                emptyState(icon: "tray", text: "No messages yet.")
            } else if filtered.isEmpty {
                emptyState(icon: "magnifyingglass", text: "No messages match \u{201c}\(searchText)\u{201d}.")
            } else {
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(filtered) { message in
                            MessageRow(message: message, savedToast: savedToast, onDelete: { pendingDelete = message })
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)
                }
            }
        }
        .alert(
            "Delete message from \(pendingDelete?.name ?? "")?",
            isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })
        ) {
            Button("Cancel", role: .cancel) { pendingDelete = nil }
            Button("Delete", role: .destructive) {
                if let message = pendingDelete {
                    rtdb.deleteMessage(id: message.id)
                    savedToast.flash()
                }
                pendingDelete = nil
            }
        }
        .savedToast(savedToast)
    }

    @ViewBuilder
    private func emptyState(icon: String, text: String) -> some View {
        VStack(spacing: 10) {
            Image(systemName: icon).font(.system(size: 40)).foregroundStyle(.tertiary)
            Text(text).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct MessageRow: View {
    @EnvironmentObject private var rtdb: RTDBService
    let message: ContactMessage
    @ObservedObject var savedToast: SavedToastController
    let onDelete: () -> Void
    @State private var expanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(message.name).font(.headline.weight(.semibold))
                if !message.read {
                    Circle().fill(.badgipAccent).frame(width: 6, height: 6)
                }
                Spacer()
                Text(message.date, style: .date).font(.caption).foregroundStyle(.secondary)
            }
            Text(message.email).font(.caption).foregroundStyle(.secondary)
            if !message.phone.isEmpty {
                Text(message.phone).font(.caption).foregroundStyle(.secondary)
            }
            Text(message.message)
                .font(.body)
                .lineLimit(expanded ? nil : 4)
                .padding(.top, 2)
            HStack(spacing: 8) {
                Button("Reply") { reply() }
                    .buttonStyle(.badgipSecondary)
                    .controlSize(.small)
                Button(message.read ? "Mark Unread" : "Mark Read") {
                    rtdb.markMessageRead(id: message.id, read: !message.read)
                    savedToast.flash()
                }
                .buttonStyle(.badgipSecondary)
                .controlSize(.small)
                Button { onDelete() } label: { Image(systemName: "trash") }
                    .buttonStyle(.badgipIcon(tint: .red))
                Spacer()
                Button(expanded ? "Show less" : "Show more") { expanded.toggle() }
                    .buttonStyle(.plain)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.top, 4)
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 12).fill(Color.badgipSurface))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color.badgipBorder, lineWidth: 1))
        .contentShape(Rectangle())
        .onTapGesture { expanded.toggle() }
    }

    private func reply() {
        guard let encoded = "Re: your message".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "mailto:\(message.email)?subject=\(encoded)")
        else { return }
        NSWorkspace.shared.open(url)
        if !message.read { rtdb.markMessageRead(id: message.id, read: true) }
    }
}
