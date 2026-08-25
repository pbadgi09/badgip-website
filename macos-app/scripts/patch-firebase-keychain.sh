#!/bin/bash
# FirebaseAuth's own source comment (FIRAuthKeychainServices.m) says using
# the "data protection keychain" on macOS "requires a configured
# provisioning profile to function properly - which cannot be checked into
# the repo," and provides a FIREBASE_AUTH_MACOS_TESTING escape hatch that
# skips it. SPM gives no supported way for a downstream package to inject
# that compiler define into a dependency's build, so this patches the
# checked-out source directly instead - falls back to the plain macOS
# keychain (no entitlement/provisioning profile needed), which is exactly
# what that escape hatch is for. This is why saveProject-style keychain
# writes were failing under ad-hoc signing (no entitlements possible) and
# why a real "Apple Development" cert needs a provisioning profile Xcode
# can't generate for a bare SPM package (no .xcodeproj Signing tab in
# Xcode 14.2, and `swift package generate-xcodeproj` chokes on Firebase's
# leveldb/IsAppEncrypted C/C++ targets).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_FILE="$SCRIPT_DIR/../.build/checkouts/firebase-ios-sdk/FirebaseAuth/Sources/Storage/FIRAuthKeychainServices.m"

if [ ! -f "$TARGET_FILE" ]; then
  echo "Firebase checkout not found yet (run swift build first to resolve dependencies) - skipping patch."
  exit 0
fi

if grep -q "kSecUseDataProtectionKeychain" "$TARGET_FILE"; then
  echo "Patching FIRAuthKeychainServices.m to skip the data-protection keychain..."
  sed -i '' 's/.*kSecUseDataProtectionKeychain.*/    \/\/ Patched by scripts\/patch-firebase-keychain.sh - see comment there./' "$TARGET_FILE"
else
  echo "FIRAuthKeychainServices.m already patched."
fi
