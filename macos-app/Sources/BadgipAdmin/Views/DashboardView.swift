import SwiftUI

enum DashboardSection: String, CaseIterable, Identifiable {
    case projects = "Projects"
    case about = "About"
    case sections = "Sections"
    case youtube = "YouTube"
    case blog = "Blog"
    case settings = "Settings"
    case messages = "Messages"
    case deploy = "Deploy"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .projects: return "folder"
        case .about: return "person.text.rectangle"
        case .sections: return "square.grid.2x2"
        case .youtube: return "play.rectangle"
        case .blog: return "doc.richtext"
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
                Section {
                    ForEach(DashboardSection.allCases) { section in
                        NavigationLink(
                            destination: destination(for: section),
                            tag: section,
                            selection: $selection
                        ) {
                            Label(section.rawValue, systemImage: section.icon)
                                .symbolRenderingMode(.hierarchical)
                        }
                    }
                }
            }
            .listStyle(SidebarListStyle())
            .safeAreaInset(edge: .bottom) {
                VStack(spacing: 0) {
                    Divider()
                    Button {
                        authService.signOut()
                    } label: {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)
                    .padding(12)
                }
            }
            .frame(minWidth: 200)
            .navigationTitle("Badgip Admin")

            VStack(spacing: 8) {
                Image(systemName: "arrow.left")
                    .font(.title2)
                    .foregroundStyle(.tertiary)
                Text("Select a section to get started")
                    .foregroundStyle(.secondary)
            }
        }
        .navigationViewStyle(DoubleColumnNavigationViewStyle())
    }

    @ViewBuilder
    private func destination(for section: DashboardSection) -> some View {
        switch section {
        case .projects: ProjectListView()
        case .about: AboutEditorView()
        case .sections: SectionsView()
        case .youtube: YoutubeListView()
        case .blog: BlogListView()
        case .settings: SiteSettingsView()
        case .messages: MessagesInboxView()
        case .deploy: DeployControlsView()
        }
    }
}
