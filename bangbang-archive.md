---
title: Archive
columns: []
archive:
    -
        id: task-37
        title: Add "Clear Cache & Reload" button to Settings
        description: Added button in Settings tab with handleClearCache() method
    -
        id: task-35
        title: Add "Create BangBang Board" command
        description: Command palette option "BangBang Create Board" to manually create/reset .bangbang.md
    -
        id: task-34
        title: Auto-create .bangbang.md if no file exists
        description: Generates starter template with empty rules and standard columns on first activation
    -
        id: task-33
        title: Support both .bangbang.md and .bb.md file discovery
        description: Extension checks for .bangbang.md first, then .bb.md as fallback
    -
        id: task-40
        title: Implement archiveTask handler to write to archive file
        description: Creates/appends to .bangbang-archive.md when archiving tasks
    -
        id: task-39
        title: Add "Archive Task" action button to done tasks
        description: Archive button (📦) appears on tasks in done column
    -
        id: task-38
        title: Load archive from .bangbang-archive.md if exists
        description: Parser reads separate archive file and merges with main board display
    -
        id: task-24
        title: Implement collapsible column sections
        description: Click column headers to collapse/expand task groups
    -
        id: task-21
        title: Implement drag-and-drop task updates
        description: Update .bangbang.md when tasks are moved between columns
    -
        id: task-41
        title: Fix real-time updates for BangBang watcher
        description: Ensure board reflects external agent edits without polling
    -
        id: task-0
        title: Add rules section to .bangbang.md spec
        description: Created rules with always/never/prefer/context categories
    -
        id: task-27
        title: Improve file watcher with RelativePattern and debouncing
        description: Better compatibility with agent edits and rapid file changes
    -
        id: task-26
        title: Fix webview blank screen when moving between panes
        description: Reset first render flag in resolveWebviewView to handle pane moves
    -
        id: task-25
        title: Setup VSIX packaging workflow
        description: Added vsce package script and README for direct installation
    -
        id: task-23
        title: Add tab navigation for Tasks/Rules/Settings
        description: Tabbed interface with change indicators and state preservation
    -
        id: task-18
        title: Implement YAML parser in TypeScript
        description: Parse .bangbang.md frontmatter using js-yaml in boardViewProvider.ts
    -
        id: task-20
        title: Add file watcher for .bangbang.md changes
        description: Live update UI when file changes, preserves tab state via postMessage
    -
        id: task-19
        title: Create webview panel for kanban board
        description: Render columns and tasks in VSCode sidebar with drag-and-drop
    -
        id: task-22
        title: Add rules display section
        description: Show always/never/prefer/context rules in tabbed UI
    -
        id: task-16
        title: Create .bangbang.schema.json specification
        description: JSON Schema for YAML frontmatter validation with task/column/rule definitions
    -
        id: task-17
        title: Scaffold VSCode extension structure
        description: Create extension with package.json, tsconfig, and basic activation
    -
        id: task-1
        title: Update Board model to support rules
        description: Added Rule and Rules structs to internal/models/board.go
    -
        id: task-32
        title: Update schema and types for new features
        description: Added archive support and relatedFiles to schema and TypeScript types
    -
        id: task-31
        title: Implement markdown rendering in VSCode extension
        description: Render task descriptions as markdown with full formatting support (code blocks, lists, etc.)
    -
        id: task-30
        title: Add relatedFiles field to task schema
        description: Allow tasks to reference specific files or code locations with line numbers
---
