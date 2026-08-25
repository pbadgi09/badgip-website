# make clean run  ->  quit + remove any installed Badgip Admin.app, build a
# fresh release .app, package it as a .dmg, install it to /Applications, and
# launch it. Each target also works standalone (make dmg, make install, ...).
#
# "clean" only removes the *installed app* and this project's build/ output
# (the assembled .app + .dmg) — it does NOT wipe macos-app/.build, the Swift
# Package Manager cache, since that holds the patched Firebase checkout
# (scripts/patch-firebase-keychain.sh) and a from-scratch Firebase rebuild
# takes many minutes. `make nuke` below does the full wipe if you ever need it.

SHELL := /bin/bash
.SHELLFLAGS := -euo pipefail -c

APP_NAME     := BadgipAdmin
VOLUME_NAME  := Badgip Admin
MACOS_DIR    := macos-app
BUILD_DIR    := $(MACOS_DIR)/build
APP_BUNDLE   := $(BUILD_DIR)/$(APP_NAME).app
DMG_PATH     := $(BUILD_DIR)/$(APP_NAME).dmg
INSTALLED_APP := /Applications/$(APP_NAME).app
BUNDLE_ID    := com.badgip.admin

.PHONY: clean dmg install open run nuke

clean:
	@echo "==> Quitting $(APP_NAME) if it's running"
	@osascript -e 'tell application id "$(BUNDLE_ID)" to quit' >/dev/null 2>&1 || true
	@pkill -x "$(APP_NAME)" >/dev/null 2>&1 || true
	@sleep 1
	@echo "==> Detaching any mounted \"$(VOLUME_NAME)\" volume"
	@if [ -d "/Volumes/$(VOLUME_NAME)" ]; then hdiutil detach "/Volumes/$(VOLUME_NAME)" -quiet -force || true; fi
	@echo "==> Removing installed app at $(INSTALLED_APP)"
	@rm -rf "$(INSTALLED_APP)"
	@echo "==> Removing old build/ output"
	@rm -rf "$(BUILD_DIR)"
	@echo "Clean complete."

dmg:
	@echo "==> Building release app bundle"
	@cd $(MACOS_DIR) && ./scripts/build-app.sh release
	@echo "==> Creating $(DMG_PATH)"
	@rm -f "$(DMG_PATH)"
	@hdiutil create -volname "$(VOLUME_NAME)" -srcfolder "$(APP_BUNDLE)" -ov -format UDZO "$(DMG_PATH)"
	@echo "DMG created: $(DMG_PATH)"

install: dmg
	@echo "==> Mounting $(DMG_PATH)"
	@MOUNT_DIR=$$(hdiutil attach "$(DMG_PATH)" -nobrowse -readonly | grep -o '/Volumes/.*'); \
	echo "Mounted at $$MOUNT_DIR"; \
	rm -rf "$(INSTALLED_APP)"; \
	cp -R "$$MOUNT_DIR/$(APP_NAME).app" /Applications/; \
	hdiutil detach "$$MOUNT_DIR" -quiet || hdiutil detach "$$MOUNT_DIR" -quiet -force
	@echo "==> Clearing quarantine attribute (unsigned/unnotarized — expected)"
	@xattr -cr "$(INSTALLED_APP)" || true
	@echo "Installed: $(INSTALLED_APP)"

open:
	@echo "==> Launching $(APP_NAME)"
	@open "$(INSTALLED_APP)"

run: install open

# Full wipe, including the SPM build cache (forces a from-scratch Firebase
# SDK rebuild — many minutes). Only needed if the incremental build cache
# itself is suspected to be the problem, not for routine "give me a fresh app".
nuke: clean
	@echo "==> Removing $(MACOS_DIR)/.build (forces a full SPM rebuild next time)"
	@rm -rf "$(MACOS_DIR)/.build"
	@echo "Nuke complete."
