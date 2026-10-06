#!/bin/bash
# Assembles a real, launchable BadgipAdmin.app from the Swift Package build
# output. This exists because SPM executable targets have no native .app
# bundle - Xcode fakes one internally when you hit Run, but this script does
# it explicitly so the app can be built, registered with Launch Services
# (needed for the OAuth URL-scheme callback), and launched entirely from the
# command line. It's also the first half of the eventual .dmg packaging step.
set -euo pipefail

CONFIG="${1:-debug}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/../.build/$CONFIG"
BUNDLE="$SCRIPT_DIR/../build/BadgipAdmin.app"

echo "Resolving dependencies"
(cd "$SCRIPT_DIR/.." && swift package resolve)

"$SCRIPT_DIR/patch-firebase-keychain.sh"

echo "Building ($CONFIG)"
(cd "$SCRIPT_DIR/.." && swift build -c "$CONFIG")

echo "Assembling $BUNDLE"
rm -rf "$BUNDLE"
mkdir -p "$BUNDLE/Contents/MacOS" "$BUNDLE/Contents/Resources"

cp "$APP_DIR/BadgipAdmin" "$BUNDLE/Contents/MacOS/BadgipAdmin"
cp "$SCRIPT_DIR/../Sources/BadgipAdmin/Info.plist" "$BUNDLE/Contents/Info.plist"

# App icon — kept outside Sources/ (so SwiftPM doesn't treat it as an
# unhandled resource) and copied straight into Contents/Resources where
# macOS's CFBundleIconFile lookup finds it.
if [ -f "$SCRIPT_DIR/../AppIcon.icns" ]; then
  cp "$SCRIPT_DIR/../AppIcon.icns" "$BUNDLE/Contents/Resources/AppIcon.icns"
fi

# Copy every SPM-generated resource bundle (the app's own holds
# GoogleService-Info.plist; Firebase/GoogleUtilities ship their own too).
# Newer SwiftPM (Swift 6.x) makes .build/$CONFIG a symlink to
# .build/out/Products/<Config>/, so the trailing slash + -L follows it.
found_bundle=0
while IFS= read -r -d '' RESOURCE_BUNDLE; do
  cp -R "$RESOURCE_BUNDLE" "$BUNDLE/Contents/Resources/"
  found_bundle=1
done < <(find -L "$APP_DIR/" -maxdepth 1 -name "*.bundle" -print0)
if [ "$found_bundle" -eq 0 ]; then
  echo "WARNING: no *.bundle resource found under $APP_DIR — app will crash at launch" >&2
fi

echo "Ad-hoc signing"
codesign --force --deep --sign - "$BUNDLE"

echo "Registering with Launch Services"
/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister -f "$BUNDLE"

echo "Done: $BUNDLE"
