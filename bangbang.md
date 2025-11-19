---
title: BangBang Protocol & VSCode Extension
agent:
    instructions:
        - Modify only the YAML frontmatter
        - Preserve all IDs
        - Keep ordering
        - Make minimal changes
        - Preserve unknown fields
rules:
    always:
        -
            id: 1
            rule: update task status in this file as you work (todo → in-progress → done)
        -
            id: 2
            rule: use TypeScript for VSCode extension development
        -
            id: 3
            rule: handle all errors explicitly - no silent failures
    never:
        -
            id: 1
            rule: create new files when editing existing ones accomplishes the goal
        -
            id: 2
            rule: bypass YAML frontmatter structure for .bangbang.md files
    prefer:
        -
            id: 1
            rule: simple, explicit solutions over complex abstractions
        -
            id: 2
            rule: VSCode extension as primary interface
    context:
        -
            id: 1
            rule: .bangbang.md is a Task Description Language (TDL) using YAML frontmatter
        -
            id: 2
            rule: UI follows true-black aesthetic (#000) with Inter typography and 16px grid
        -
            id: 3
            rule: task IDs follow pattern task-N, column IDs are kebab-case
columns:
    -
        id: todo
        title: To Do
        tasks: []
    -
        id: in-progress
        title: In Progress
        tasks: []
    -
        id: review
        title: Review
        tasks: []
    -
        id: done
        title: Done
        tasks:
            -
                id: task-41
                title: Implement Quick Add Task feature
                description: Add command palette, keyboard shortcut (Cmd/Ctrl+Shift+T), and + buttons in column headers for quick task creation
            -
                id: task-42
                title: Add Task Templates & Subtasks support
                description: Support nested subtasks in YAML with visual progress indicators and templates for common task types
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
---
