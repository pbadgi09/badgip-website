import SwiftUI

enum DashboardSection: String, CaseIterable, Identifiable {
    case projects = "Projects"
    case about = "About"
    case sections = "Sections"
    case youtube = "YouTube"
    case blog = "Blog"
    case gallery = "Gallery"
    case settings = "Settings"
    case messages = "Messages"
    case server = "Server"
    case advanced = "Advanced"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .projects: return "folder"
        case .about: return "person.text.rectangle"
        case .sections: return "square.grid.2x2"
        case .youtube: return "play.rectangle"
        case .blog: return "doc.richtext"
        case .gallery: return "photo.on.rectangle.angled"
        case .settings: return "gearshape"
        case .messages: return "envelope"
        case .server: return "server.rack"
        case .advanced: return "wrench.and.screwdriver"
        }
    }
}

// A custom-built sidebar instead of NavigationView/SidebarListStyle — this
// app targets macOS 12, so NavigationSplitView (13+) isn't available, and
// the stock sidebar list didn't give the pill-shaped, accent-highlighted
// selection state that matches the website's own nav (.site-nav__link.is-
// active). Since navigation here is just "pick one of nine screens" with no
// push/pop stack, a plain HStack + custom rows is simpler than fighting
// NavigationView's own chrome for that look anyway.
struct DashboardView: View {
    @EnvironmentObject private var authService: FirebaseAuthService
    @EnvironmentObject private var unsavedGuard: UnsavedChangesGuard
    @State private var selection: DashboardSection = .projects
    @State private var pendingAction: (() -> Void)?
    @State private var showDiscardConfirm = false

    var body: some View {
        HStack(spacing: 0) {
            sidebar
            Divider()
            destination(for: selection)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(minWidth: 960, minHeight: 640)
        .alert("Discard unsaved changes?", isPresented: $showDiscardConfirm) {
            Button("Discard", role: .destructive) {
                unsavedGuard.hasUnsavedChanges = false
                pendingAction?()
                pendingAction = nil
            }
            Button("Keep Editing", role: .cancel) { pendingAction = nil }
        } message: {
            Text("You have unsaved changes on this screen that will be lost.")
        }
    }

    // Every navigation-away action (switching sidebar sections, signing
    // out) goes through here so an in-progress edit on About/Settings (the
    // only two screens with a deliberate Save button — everything else
    // auto-persists instantly) can't be silently discarded.
    private func requestNavigation(_ action: @escaping () -> Void) {
        if unsavedGuard.hasUnsavedChanges {
            pendingAction = action
            showDiscardConfirm = true
        } else {
            action()
        }
    }

    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Circle()
                    .fill(Color.badgipAccent)
                    .frame(width: 8, height: 8)
                Text("Badgip Admin")
                    .font(.system(.headline, design: .rounded).weight(.bold))
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 16)

            ScrollView {
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(DashboardSection.allCases) { section in
                        SidebarRow(section: section, isSelected: section == selection) {
                            guard section != selection else { return }
                            requestNavigation { selection = section }
                        }
                    }
                }
                .padding(.horizontal, 12)
            }

            Spacer(minLength: 0)

            Divider()
            Button {
                requestNavigation { authService.signOut() }
            } label: {
                Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                    .font(.callout.weight(.medium))
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
        }
        .frame(width: 220)
        .background(Color.badgipSurface)
    }

    @ViewBuilder
    private func destination(for section: DashboardSection) -> some View {
        switch section {
        case .projects: ProjectListView()
        case .about: AboutEditorView()
        case .sections: SectionsView()
        case .youtube: YoutubeListView()
        case .blog: BlogListView()
        case .gallery: GalleryView()
        case .settings: SiteSettingsView()
        case .messages: MessagesInboxView()
        case .server: ServerView()
        case .advanced: DeployControlsView()
        }
    }
}

private struct SidebarRow: View {
    let section: DashboardSection
    let isSelected: Bool
    let onSelect: () -> Void
    @State private var isHovering = false

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 10) {
                Image(systemName: section.icon)
                    .symbolRenderingMode(.hierarchical)
                    .frame(width: 18)
                Text(section.rawValue)
                    .font(.callout.weight(isSelected ? .semibold : .regular))
                Spacer(minLength: 0)
            }
            .foregroundStyle(isSelected ? .black : Color.primary)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                Capsule().fill(
                    isSelected ? Color.badgipAccent : (isHovering ? Color.badgipSurfaceHover : .clear)
                )
            )
        }
        .buttonStyle(.plain)
        .onHover { isHovering = $0 }
        .animation(.easeOut(duration: 0.12), value: isHovering)
        .animation(.easeOut(duration: 0.12), value: isSelected)
    }
}
