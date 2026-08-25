import SwiftUI

enum DashboardSection: String, CaseIterable, Identifiable {
    case projects = "Projects"
    case about = "About"
    case settings = "Settings"
    case messages = "Messages"
    case deploy = "Deploy"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .projects: return "folder"
        case .about: return "person.text.rectangle"
        case .settings: return "gearshape"
        case .messages: return "envelope"
        case .deploy: return "arrow.triangle.2.circlepath"
        }
    }
}

struct DashboardView: View {
    @EnvironmentObject private var authService: FirebaseAuthService
    @State private var selection: DashboardSection? = .projects

    var body: some View {
        NavigationView {
            List {
                ForEach(DashboardSection.allCases) { section in
                    NavigationLink(
                        destination: destination(for: section),
                        tag: section,
                        selection: $selection
                    ) {
                        Label(section.rawValue, systemImage: section.icon)
                    }
                }
            }
            .listStyle(SidebarListStyle())
            .safeAreaInset(edge: .bottom) {
                Button("Sign Out") {
                    authService.signOut()
                }
                .padding(12)
                .frame(maxWidth: .infinity)
            }
            .frame(minWidth: 200)
            .navigationTitle("Badgip Admin")

            Text("Select a section")
                .foregroundStyle(.secondary)
        }
        .navigationViewStyle(DoubleColumnNavigationViewStyle())
    }

    @ViewBuilder
    private func destination(for section: DashboardSection) -> some View {
        switch section {
        case .projects: ProjectListView()
        case .about: AboutEditorView()
        case .settings: SiteSettingsView()
        case .messages: MessagesInboxView()
        case .deploy: DeployControlsView()
        }
    }
}
