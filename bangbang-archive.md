---
title: Archive
columns: []
archive:
    -
        id: task-7
        title: Add stats configuration UI
        description: Added settings tab UI to configure which columns show as stat cards
        priority: medium
    -
        id: task-6
        title: Replace edit modal with file navigation
        description: Edit button now opens the bangbang.md file at the task location for direct editing
        priority: high
    -
        id: task-5
        title: Fix search section padding
        description: Made search section padding match other header cards
        priority: low
    -
        id: task-4
        title: Add configurable stat cards
        description: Implemented support for up to 4 custom column stats via statsConfig
        priority: medium
    -
        id: task-3
        title: Simplify search interface
        description: Removed complex filter dropdowns and kept only search box
        priority: high
    -
        id: task-44
        title: Protocol v0.4.0 Testing
        description: Verify all non-hidden files work correctly with the VSCode extension
        subtasks:
            -
                id: task-44-1
                title: Test file discovery priority
                completed: true
            -
                id: task-44-2
                title: Verify agent instructions work
                completed: true
            -
                id: task-44-3
                title: Confirm backward compatibility
                completed: true
    -
        id: task-43
        title: Test Subtasks Feature Implementation
        description: Verify subtasks rendering and progress tracking works correctly
        subtasks:
            -
                id: task-43-1
                title: Verify progress bar displays correctly
                completed: true
            -
                id: task-43-2
                title: Test checkbox styling for completed items
                completed: true
            -
                id: task-43-3
                title: Check subtask count display (2/4 format)
                completed: true
            -
                id: task-43-4
                title: Validate YAML serialization with subtasks
                completed: true
    -
        id: task-42
        title: Add Task Templates & Subtasks support
        description: Support nested subtasks in YAML with visual progress indicators and templates for common task types
    -
        id: task-41
        title: Implement Quick Add Task feature
        description: Add command palette, keyboard shortcut (Cmd/Ctrl+Shift+T), and + buttons in column headers for quick task creation
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
