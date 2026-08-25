import Foundation

struct ContactMessage: Identifiable, Codable, Equatable {
    var id: String
    var name: String = ""
    var email: String = ""
    var message: String = ""
    var phone: String = ""
    var createdAt: Double = 0
    var read: Bool = false

    var date: Date {
        Date(timeIntervalSince1970: createdAt / 1000)
    }

    static func from(id: String, dict: [String: Any]) -> ContactMessage {
        ContactMessage(
            id: id,
            name: dict["name"] as? String ?? "",
            email: dict["email"] as? String ?? "",
            message: dict["message"] as? String ?? "",
            phone: dict["phone"] as? String ?? "",
            createdAt: dict["createdAt"] as? Double ?? 0,
            read: dict["read"] as? Bool ?? false
        )
    }
}
