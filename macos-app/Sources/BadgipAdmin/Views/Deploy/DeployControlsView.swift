import SwiftUI

struct DeployControlsView: View {
    @State private var patInput: String = ""
    @State private var hasSavedPAT = false
    @State private var purgePath: String = ""
    @State private var statusMessage: String?
    @State private var isWorking = false
    @StateObject private var savedToast = SavedToastController()

    private let githubService = GitHubService()

    @State private var showRecoveryTools = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Advanced").font(.title.weight(.bold))
                    Text("Save already publishes everything — content is live via Firebase the instant you save, and image uploads deploy automatically. The tools below are for the GitHub connection itself and rare manual recovery.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                EditorCard(title: "GitHub Personal Access Token") {
                    Text("Required for uploading/replacing/deleting images and files — every screen with an image picker uses this.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(hasSavedPAT ? "A token is saved in Keychain." : "No token saved yet.")
                        .font(.caption)
                        .foregroundStyle(hasSavedPAT ? Color.secondary : Color.orange)
                    HStack {
                        SecureField("Fine-grained PAT (repo-scoped, Contents + Actions: Read and write)", text: $patInput)
                            .textFieldStyle(.badgip)
                        Button("Save") {
                            KeychainService.save(key: KeychainKey.githubPAT, value: patInput)
                            patInput = ""
                            hasSavedPAT = true
                            savedToast.flash()
                        }
                        .buttonStyle(.badgipSecondary)
                        .disabled(patInput.isEmpty)
                    }
                    if hasSavedPAT {
                        Button("Remove Saved Token", role: .destructive) {
                            KeychainService.delete(key: KeychainKey.githubPAT)
                            hasSavedPAT = false
                            savedToast.flash()
                        }
                        .buttonStyle(.badgipSecondary)
                    }
                }

                EditorCard(title: "Recovery tools") {
                    DisclosureGroup("Rarely needed — expand only if something's actually stuck", isExpanded: $showRecoveryTools) {
                        VStack(alignment: .leading, spacing: 16) {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Redeploy").font(.subheadline.weight(.semibold))
                                Text("Manually retries the GitHub Pages build. Every save/upload already triggers this automatically — only useful if an automatic run failed.")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Button {
                                    Task { await triggerRedeploy() }
                                } label: {
                                    Label("Retry GitHub Pages Build", systemImage: "arrow.triangle.2.circlepath")
                                }
                                .buttonStyle(.badgipSecondary)
                                .disabled(isWorking)
                            }

                            VStack(alignment: .leading, spacing: 6) {
                                Text("Purge image cache").font(.subheadline.weight(.semibold))
                                Text("Image uploads already purge their own cache automatically. Only useful after replacing a file some other way, outside this app.")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                HStack {
                                    TextField("assets/projects/my-app/cover.jpg", text: $purgePath)
                                        .textFieldStyle(.badgip)
                                    Button("Purge") {
                                        Task { await purgeManually() }
                                    }
                                    .buttonStyle(.badgipSecondary)
                                    .disabled(purgePath.isEmpty || isWorking)
                                }
                            }
                        }
                        .padding(.top, 10)
                    }
                    .font(.caption)
                }

                if let statusMessage {
                    Text(statusMessage).font(.caption).foregroundStyle(.secondary)
                }
            }
            .padding(24)
        }
        .savedToast(savedToast)
        .onAppear {
            hasSavedPAT = (KeychainService.read(key: KeychainKey.githubPAT)?.isEmpty == false)
        }
    }

    private func triggerRedeploy() async {
        isWorking = true
        statusMessage = "Triggering rebuild…"
        do {
            try await githubService.triggerWorkflowDispatch()
            statusMessage = "Rebuild triggered — check the Actions tab on GitHub."
        } catch {
            statusMessage = error.localizedDescription
        }
        isWorking = false
    }

    private func purgeManually() async {
        isWorking = true
        statusMessage = "Purging…"
        await JsDelivrService.purge(repoPath: purgePath)
        statusMessage = "Purge requested for \(purgePath)."
        isWorking = false
    }
}
