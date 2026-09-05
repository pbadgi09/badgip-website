import SwiftUI

/// One icon+title+description row editor — shared by an app's Features
/// list (WhmsycodeAppEditorView) and the homepage's "Why WHMSYCODE" list
/// (WhmsycodeHomepageEditorView), since both are the same WhmsycodeFeature
/// shape. The icon is a real uploaded/picked image (rendered scale-to-fit on
/// the live site), not a fixed keyword — repoPath/storedPathBuilder let each
/// caller use its own folder convention for where the icon actually lives.
struct WhmsycodeFeatureRowEditor: View {
    @Binding var feature: WhmsycodeFeature
    let service: WhmsycodeGitHubService
    let repoPath: (String) -> String
    let storedPathBuilder: (String) -> String
    var onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top) {
                WhmsycodeImageField(
                    label: "Icon",
                    storedPath: $feature.icon,
                    service: service,
                    maxDimension: 512,
                    repoPath: repoPath,
                    storedPathBuilder: storedPathBuilder
                )
                Button {
                    onDelete()
                } label: {
                    Image(systemName: "trash")
                }
                .buttonStyle(.badgipIcon(tint: .red))
            }
            LabeledField(label: "Title", text: $feature.title)
            LabeledField(label: "Description", text: $feature.description, multiline: true)
            Divider()
        }
    }
}
