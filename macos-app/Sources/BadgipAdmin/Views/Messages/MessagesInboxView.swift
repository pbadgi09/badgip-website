import SwiftUI

struct MessagesInboxView: View {
    @EnvironmentObject private var rtdb: RTDBService
    @State private var messages: [ContactMessage] = []

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Messages").font(.title2.bold())
                Spacer()
                let unread = messages.filter { !$0.read }.count
                if unread > 0 {
                    Text("\(unread) unread").font(.caption).foregroundStyle(.green)
                }
            }
            .padding()

            if messages.isEmpty {
                Text("No messages yet.")
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(messages) { message in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(message.name).font(.headline)
                                if !message.read {
                                    Circle().fill(.green).frame(width: 6, height: 6)
                                }
                                Spacer()
                                Text(message.date, style: .date).font(.caption).foregroundStyle(.secondary)
                            }
                            Text(message.email).font(.caption).foregroundStyle(.secondary)
                            Text(message.message).font(.body).lineLimit(4)
                            HStack {
                                Button(message.read ? "Mark Unread" : "Mark Read") {
                                    rtdb.markMessageRead(id: message.id, read: !message.read)
                                }
                                Button("Delete", role: .destructive) {
                                    rtdb.deleteMessage(id: message.id)
                                }
                            }
                            .font(.caption)
                        }
                        .padding(.vertical, 6)
                    }
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
    }
}
