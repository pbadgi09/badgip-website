import SwiftUI

struct MessagesInboxView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @State private var messages: [ContactMessage] = []
    @State private var pendingDelete: ContactMessage?
    @StateObject private var savedToast = SavedToastController()

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Messages").font(.title.weight(.bold))
                Spacer()
                let unread = messages.filter { !$0.read }.count
                if unread > 0 {
                    Text("\(unread) unread")
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.badgipAccent.opacity(0.15))
                        .foregroundStyle(.badgipAccent)
                        .clipShape(Capsule())
                }
            }
            .padding(24)

            if messages.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "tray")
                        .font(.system(size: 40))
                        .foregroundStyle(.tertiary)
                    Text("No messages yet.")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(messages) { message in
                            MessageRow(message: message, savedToast: savedToast, onDelete: { pendingDelete = message })
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)
                }
            }
        }
        .onAppear {
            rtdb.observeMessages { updated in
                messages = updated
            }
        }
        .onDisappear {
            rtdb.stopObservingMessages()
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
}

private struct MessageRow: View {
    @EnvironmentObject private var rtdb: RTDBService
    let message: ContactMessage
    @ObservedObject var savedToast: SavedToastController
    let onDelete: () -> Void

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
            Text(message.message).font(.body).lineLimit(4).padding(.top, 2)
            HStack(spacing: 8) {
                Button(message.read ? "Mark Unread" : "Mark Read") {
                    rtdb.markMessageRead(id: message.id, read: !message.read)
                    savedToast.flash()
                }
                .buttonStyle(.badgipSecondary)
                .controlSize(.small)
                Button("Delete", action: onDelete)
                    .buttonStyle(.badgipSecondary)
                    .controlSize(.small)
                    .tint(.red)
            }
            .padding(.top, 4)
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 12).fill(Color.badgipSurface))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color.badgipBorder, lineWidth: 1))
    }
}
