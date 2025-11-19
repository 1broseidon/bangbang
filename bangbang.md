---
title: BangBang Protocol & VSCode Extension
schema: https://raw.githubusercontent.com/1broseidon/bangbang/refs/heads/main/bangbang.schema.json
agent:
    instructions:
        - Modify only the YAML frontmatter
        - Preserve all IDs
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
            rule: bypass YAML frontmatter structure for bangbang.md files
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
            rule: bangbang.md is a Task Description Language (TDL) using YAML frontmatter
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
        tasks:
            -
                id: task-1
                title: Document search functionality
                description: Add documentation for the new simplified search feature
                priority: low
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
                id: task-ci-version
                title: Align CI release tag with package version
                description: Ensure CI release tag matches npm package version
                priority: high
            -
                id: task-2
                title: Bump VSCode extension to 0.4.2
                description: Update package.json version to match release tag
                priority: high
            -
                id: task-3
                title: Sync package-lock version metadata
                description: Ensure package-lock version updated to 0.4.2
                priority: medium
statsConfig:
    columns:
        - in-progress
        - review
        - done
---
