import SwiftUI

struct DeployControlsView: View {
    @State private var patInput: String = ""
    @State private var hasSavedPAT = false
    @State private var purgePath: String = ""
    @State private var statusMessage: String?
    @State private var isWorking = false

    private let githubService = GitHubService()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Deploy").font(.title.weight(.bold))

                EditorCard(title: "GitHub Personal Access Token") {
                    Text(hasSavedPAT ? "A token is saved in Keychain." : "No token saved yet.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    HStack {
                        SecureField("Fine-grained PAT (repo-scoped, Contents + Actions: Read and write)", text: $patInput)
                            .textFieldStyle(.roundedBorder)
                        Button("Save") {
                            KeychainService.save(key: KeychainKey.githubPAT, value: patInput)
                            patInput = ""
                            hasSavedPAT = true
                        }
                        .buttonStyle(.badgipSecondary)
                        .disabled(patInput.isEmpty)
                    }
                    if hasSavedPAT {
                        Button("Remove Saved Token", role: .destructive) {
                            KeychainService.delete(key: KeychainKey.githubPAT)
                            hasSavedPAT = false
                        }
                        .buttonStyle(.badgipSecondary)
                        .tint(.red)
                    }
                }

                EditorCard(title: "Redeploy") {
                    Text("Triggers the GitHub Actions Pages workflow. Only needed after a code change — content edits are already live via Firebase.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Button {
                        Task { await triggerRedeploy() }
                    } label: {
                        Label("Trigger GitHub Pages Rebuild", systemImage: "arrow.triangle.2.circlepath")
                    }
                    .buttonStyle(.badgipPrimary)
                    .disabled(isWorking)
                }

                EditorCard(title: "Purge jsDelivr Cache") {
                    Text("Image uploads purge automatically. Use this for a manual purge, e.g. after replacing a file outside the app.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    HStack {
                        TextField("assets/projects/my-app/cover.jpg", text: $purgePath)
                            .textFieldStyle(.roundedBorder)
                        Button("Purge") {
                            Task { await purgeManually() }
                        }
                        .buttonStyle(.badgipSecondary)
                        .disabled(purgePath.isEmpty || isWorking)
                    }
                }

                if let statusMessage {
                    Text(statusMessage).font(.caption).foregroundStyle(.secondary)
                }
            }
            .padding(24)
        }
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
