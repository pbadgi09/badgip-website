import SwiftUI

struct WhmsycodeAppListView: View {
    @State private var apps: [WhmsycodeManifestEntry] = []
    @State private var isLoading = true
    @State private var loadError: String?
    @State private var editingSlug: String?
    @State private var isEditingApp = false
    @State private var isCreatingNew = false
    @State private var pat: String = KeychainService.read(key: KeychainKey.whmsycodeGitHubPAT) ?? ""
    @StateObject private var savedToast = SavedToastController()

    private let service = WhmsycodeGitHubService()

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("WHMSYCODE").font(.title.weight(.bold))
                Spacer()
                Button {
                    isCreatingNew = true
                } label: {
                    Label("New App", systemImage: "plus")
                }
                .buttonStyle(.badgipPrimary)
            }
            .padding(24)

            EditorCard(title: "GitHub access") {
                Text("A fine-grained personal access token scoped to the whmsycode.com-website repo (Contents: Read/write).")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                HStack {
                    SecureField("GitHub personal access token", text: $pat)
                        .textFieldStyle(.badgip)
                    Button("Save") {
                        KeychainService.save(key: KeychainKey.whmsycodeGitHubPAT, value: pat)
                        savedToast.flash()
                        Task { await load() }
                    }
                    .buttonStyle(.badgipSecondary)
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 16)

            Group {
                if isLoading {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let loadError {
                    VStack(spacing: 10) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 32))
                            .foregroundStyle(.secondary)
                        Text(loadError)
                            .foregroundStyle(.secondary)
                            .font(.callout)
                            .multilineTextAlignment(.center)
                        Button("Retry") { Task { await load() } }
                            .buttonStyle(.badgipSecondary)
                    }
                    .padding(24)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if apps.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "globe")
                            .font(.system(size: 40))
                            .foregroundStyle(.tertiary)
                        Text("No apps yet — add your first one.")
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        ForEach(apps) { app in
                            WhmsycodeAppRow(app: app) {
                                editingSlug = app.slug
                                isEditingApp = true
                            }
                            .listRowInsets(EdgeInsets())
                        }
                    }
                    .listStyle(.plain)
                }
            }
        }
        .savedToast(savedToast)
        .sheet(isPresented: $isEditingApp) {
            if let editingSlug {
                WhmsycodeAppEditorView(slug: editingSlug, service: service) { updated in
                    if let index = apps.firstIndex(where: { $0.slug == updated.slug }) {
                        apps[index] = updated
                    }
                    isEditingApp = false
                    savedToast.flash()
                }
            }
        }
        .sheet(isPresented: $isCreatingNew) {
            WhmsycodeNewAppView(service: service) { created in
                apps.append(created)
                isCreatingNew = false
                savedToast.flash()
            }
        }
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        loadError = nil
        do {
            apps = try await service.fetchManifest()
        } catch {
            loadError = error.localizedDescription
        }
        isLoading = false
    }
}

private struct WhmsycodeAppRow: View {
    let app: WhmsycodeManifestEntry
    let onEdit: () -> Void
    @State private var isHovering = false

    var body: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 6) {
                Text(app.title).font(.headline.weight(.semibold))
                Text(app.tagline).font(.caption).foregroundStyle(.secondary).lineLimit(2)
            }
            Spacer()
            Button("Edit", action: onEdit).buttonStyle(.badgipSecondary)
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 12).fill(isHovering ? Color.badgipSurfaceHover : Color.badgipSurface))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color.badgipBorder, lineWidth: 1))
        .onHover { isHovering = $0 }
        .animation(.easeOut(duration: 0.15), value: isHovering)
    }
}
