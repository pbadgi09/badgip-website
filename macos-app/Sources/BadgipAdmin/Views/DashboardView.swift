import SwiftUI

/// The two sites this one admin app manages. The bottom pill switches the
/// whole sidebar between them — each site has its own repo/service, so this
/// keeps their editors cleanly separated instead of overlapping in one list.
enum AppSite: String, CaseIterable, Identifiable {
    case itspranavbadgi
    case whmsycode

    var id: String { rawValue }

    var label: String {
        switch self {
        case .itspranavbadgi: return "itspranavbadgi"
        case .whmsycode: return "whmsycode"
        }
    }
}

enum DashboardSection: String, Identifiable {
    // itspranavbadgi
    case overview, projects, about, sections, blog, youtube, gallery, settings, messages, server, deploy
    // whmsycode
    case wApps, wHomepage, wSiteSettings, wGallery, wAccess

    var id: String { rawValue }

    var title: String {
        switch self {
        case .overview: return "Overview"
        case .projects: return "Projects"
        case .about: return "About"
        case .sections: return "Sections"
        case .blog: return "Blog"
        case .youtube: return "YouTube"
        case .gallery: return "Gallery"
        case .settings: return "Settings"
        case .messages: return "Messages"
        case .server: return "Server"
        case .deploy: return "Deploy"
        case .wApps: return "Apps"
        case .wHomepage: return "Homepage"
        case .wSiteSettings: return "Site Settings"
        case .wGallery: return "Gallery"
        case .wAccess: return "GitHub Access"
        }
    }

    var icon: String {
        switch self {
        case .overview: return "square.grid.2x2.fill"
        case .projects: return "folder"
        case .about: return "person.text.rectangle"
        case .sections: return "square.grid.2x2"
        case .blog: return "doc.richtext"
        case .youtube: return "play.rectangle"
        case .gallery, .wGallery: return "photo.on.rectangle.angled"
        case .settings: return "gearshape"
        case .messages: return "envelope"
        case .server: return "server.rack"
        case .deploy: return "wrench.and.screwdriver"
        case .wApps: return "square.stack.3d.up"
        case .wHomepage: return "house"
        case .wSiteSettings: return "gearshape"
        case .wAccess: return "key"
        }
    }
}

/// One labeled block of sidebar rows. Grouping the (previously flat) list
/// into Content / Media / Site / System is the main declutter move.
struct SidebarGroup: Identifiable {
    let title: String
    let sections: [DashboardSection]
    var id: String { title }
}

func sidebarGroups(for site: AppSite) -> [SidebarGroup] {
    switch site {
    case .itspranavbadgi:
        return [
            SidebarGroup(title: "Home", sections: [.overview]),
            SidebarGroup(title: "Content", sections: [.projects, .about, .sections, .blog]),
            SidebarGroup(title: "Media", sections: [.youtube, .gallery]),
            SidebarGroup(title: "Site", sections: [.settings]),
            SidebarGroup(title: "System", sections: [.messages, .server, .deploy]),
        ]
    case .whmsycode:
        return [
            SidebarGroup(title: "Content", sections: [.wApps, .wHomepage, .wSiteSettings]),
            SidebarGroup(title: "Media", sections: [.wGallery]),
            SidebarGroup(title: "System", sections: [.wAccess]),
        ]
    }
}

// A custom-built sidebar instead of NavigationView/SidebarListStyle — this
// app targets macOS 12, so NavigationSplitView (13+) isn't available, and
// the stock sidebar list didn't give the pill-shaped, accent-highlighted
// selection state that matches the website's own nav. The bottom site pill
// mirrors the website's Professional/Personal mode-switch.
struct DashboardView: View {
    @EnvironmentObject private var authService: FirebaseAuthService
    @EnvironmentObject private var unsavedGuard: UnsavedChangesGuard
    @EnvironmentObject private var rtdb: RTDBService
    @SceneStorage("dashboard.site") private var site: AppSite = .itspranavbadgi
    @SceneStorage("dashboard.section") private var selection: DashboardSection = .overview
    @State private var pendingAction: (() -> Void)?
    @State private var showDiscardConfirm = false

    // whmsycode shares one service + toast across its sections (it has no
    // RTDB — everything is GitHub JSON on the whmsycode.com-website repo).
    @State private var whmsyService = WhmsycodeGitHubService()
    @StateObject private var whmsyToast = SavedToastController()

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
        .onAppear {
            rtdb.startObservingMessagesOnce()
            // A restored @SceneStorage section may belong to the other site
            // (or be a removed case) — snap to a valid one so destination()
            // never hits an invalid state.
            validateSelection()
        }
    }

    private func validateSelection() {
        let valid = sidebarGroups(for: site).flatMap { $0.sections }
        if !valid.contains(selection) {
            selection = valid.first ?? .projects
        }
    }

    // Every navigation-away action (switching sections/sites, signing out)
    // goes through here so an in-progress edit on a deliberate-Save screen
    // can't be silently discarded.
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
            .padding(.bottom, 14)

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ForEach(sidebarGroups(for: site)) { group in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(group.title.uppercased())
                                .font(.caption2.weight(.semibold))
                                .foregroundStyle(.tertiary)
                                .padding(.horizontal, 14)
                                .padding(.bottom, 2)
                            ForEach(group.sections) { section in
                                SidebarRow(
                                    section: section,
                                    isSelected: section == selection,
                                    badge: section == .messages && rtdb.unreadCount > 0 ? rtdb.unreadCount : nil
                                ) {
                                    guard section != selection else { return }
                                    requestNavigation { selection = section }
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 12)
                .padding(.top, 4)
            }

            Spacer(minLength: 0)

            SiteSwitcher(site: site) { newSite in
                guard newSite != site else { return }
                requestNavigation {
                    site = newSite
                    selection = sidebarGroups(for: newSite).first?.sections.first ?? .projects
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)

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
        .frame(width: 240)
        .background(Color.badgipSurface)
    }

    // whmsycode Homepage/Site Settings report their dirty state through the
    // app-wide guard so switching section or site warns before discarding.
    private var whmsyGuardBinding: Binding<Bool> {
        Binding(get: { unsavedGuard.hasUnsavedChanges }, set: { unsavedGuard.hasUnsavedChanges = $0 })
    }

    @ViewBuilder
    private func destination(for section: DashboardSection) -> some View {
        switch section {
        case .overview: OverviewView(onNavigate: { selection = $0 })
        case .projects: ProjectListView()
        case .about: AboutEditorView()
        case .sections: SectionsView()
        case .blog: BlogListView()
        case .youtube: YoutubeListView()
        case .gallery: GalleryView()
        case .settings: SiteSettingsView()
        case .messages: MessagesInboxView()
        case .server: ServerView()
        case .deploy: DeployControlsView()
        case .wApps:
            WhmsycodeAppsTabView(service: whmsyService, savedToast: whmsyToast)
                .padding(.top, 16)
                .savedToast(whmsyToast)
        case .wHomepage:
            WhmsycodeHomepageEditorView(service: whmsyService, savedToast: whmsyToast, hasUnsavedChanges: whmsyGuardBinding)
                .savedToast(whmsyToast)
        case .wSiteSettings:
            WhmsycodeSiteSettingsEditorView(service: whmsyService, savedToast: whmsyToast, hasUnsavedChanges: whmsyGuardBinding)
                .savedToast(whmsyToast)
        case .wGallery:
            WhmsycodeGalleryView(service: whmsyService)
                .savedToast(whmsyToast)
        case .wAccess:
            WhmsycodeAccessView(savedToast: whmsyToast)
                .savedToast(whmsyToast)
        }
    }
}

/// Bottom-of-sidebar site switcher, visually matching the website's
/// Professional/Personal mode-switch (accent-filled active segment).
private struct SiteSwitcher: View {
    let site: AppSite
    let onSelect: (AppSite) -> Void

    var body: some View {
        HStack(spacing: 4) {
            ForEach(AppSite.allCases) { option in
                Button {
                    onSelect(option)
                } label: {
                    Text(option.label)
                        .font(.caption.weight(.semibold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                        .foregroundStyle(option == site ? .black : Color.primary)
                        .background(Capsule().fill(option == site ? Color.badgipAccent : Color.clear))
                        .contentShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .background(Capsule().fill(Color.badgipSurfaceHover))
        .overlay(Capsule().strokeBorder(Color.badgipBorder))
        .animation(.easeOut(duration: 0.15), value: site)
    }
}

private struct SidebarRow: View {
    let section: DashboardSection
    let isSelected: Bool
    var badge: Int? = nil
    let onSelect: () -> Void
    @State private var isHovering = false

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 10) {
                Image(systemName: section.icon)
                    .symbolRenderingMode(.hierarchical)
                    .frame(width: 18)
                Text(section.title)
                    .font(.callout.weight(isSelected ? .semibold : .regular))
                Spacer(minLength: 0)
                if let badge {
                    Text("\(badge)")
                        .font(.caption2.weight(.bold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 1)
                        .background(Capsule().fill(isSelected ? Color.black.opacity(0.2) : Color.badgipAccent))
                        .foregroundStyle(isSelected ? .black : .black)
                }
            }
            .foregroundStyle(isSelected ? .black : Color.primary)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
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
