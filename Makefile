SHELL := /bin/bash

EXT_DIR := vscode-extension
BUILD_DIR := build
REMOTE ?= origin

.PHONY: release check-clean build install

release: check-clean
	@if [ -z "$(VERSION)" ]; then \
		echo "ERROR: VERSION is required. Usage: VERSION=0.4.3 make release"; \
		exit 1; \
	fi
	@echo "Bumping extension version to $(VERSION)"
	cd $(EXT_DIR) && npm version $(VERSION) --no-git-tag-version
	git add $(EXT_DIR)/package.json $(EXT_DIR)/package-lock.json
	git commit -m "Bump version to $(VERSION)"
	git tag v$(VERSION)
	@echo "Pushing commit and tag to $(REMOTE)"
	git push $(REMOTE) main
	git push $(REMOTE) v$(VERSION)

check-clean:
	@git diff --quiet || (echo "Working tree has unstaged changes. Please commit or stash them."; exit 1)
	@git diff --cached --quiet || (echo "Working tree has staged but uncommitted changes. Please commit or stash them."; exit 1)

build:
	@echo "Building extension..."
	@mkdir -p $(BUILD_DIR)
	cd $(EXT_DIR) && npm ci
	cd $(EXT_DIR) && npm run compile
	cd $(EXT_DIR) && npx vsce package --out ../$(BUILD_DIR)/
	@echo "✓ Extension built to $(BUILD_DIR)/"
	@ls -lh $(BUILD_DIR)/*.vsix

install: build
	@VSIX_FILE=$$(ls -t $(BUILD_DIR)/*.vsix | head -n 1); \
	echo "Installing $$VSIX_FILE..."; \
	code --install-extension "$$VSIX_FILE" && cursor --install-extension "$$VSIX_FILE"


