import SwiftUI

/// Editable, reorderable list of CTA buttons (text + link). Shared by the
/// hero (SiteSettingsView) and the project detail's left column
/// (ProjectEditView). Links may be in-page anchors (#projects / #contact) or
/// any external URL; the first button renders as primary on the site.
struct CTAListEditor: View {
    @Binding var ctas: [ProjectCTA]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach($ctas) { $cta in
                HStack(spacing: 8) {
                    TextField("Label", text: $cta.text).textFieldStyle(.badgip)
                    TextField("#projects, #contact, or a URL", text: $cta.href).textFieldStyle(.badgip)
                    Button {
                        ctas.removeAll { $0.id == cta.id }
                    } label: {
                        Image(systemName: "trash")
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)
                }
            }
            Button {
                ctas.append(ProjectCTA())
            } label: {
                Label("Add CTA", systemImage: "plus")
            }
            .buttonStyle(.badgipSecondary)
            .controlSize(.small)
        }
    }
}
