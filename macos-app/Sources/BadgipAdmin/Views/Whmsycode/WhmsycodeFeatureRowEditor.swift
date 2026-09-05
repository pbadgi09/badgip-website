import SwiftUI

/// One icon+title+description row editor — shared by an app's Features
/// list (WhmsycodeAppEditorView) and the homepage's "Why WHMSYCODE" list
/// (WhmsycodeHomepageEditorView), since both are the same WhmsycodeFeature
/// shape.
struct WhmsycodeFeatureRowEditor: View {
    @Binding var feature: WhmsycodeFeature
    var onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                LabeledField(label: "Icon (trim, compress, device, shield, spark)", text: $feature.icon)
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
