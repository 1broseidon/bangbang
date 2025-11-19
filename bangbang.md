---
title: BangBang Protocol & VSCode Extension
schema: https://raw.githubusercontent.com/1broseidon/bangbang/refs/heads/main/bangbang.schema.json
agent:
    instructions:
        - Modify only the YAML frontmatter
        - Preserve all IDs
        - Preserve unknown fields
        - use description for an overview, use subtasks for step by step instructions
        - use relatedFiles to link relevant files to the task
rules:
    always:
        -
            id: 1
            rule: use TypeScript for VSCode extension development
        -
            id: 2
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
        tasks: []
statsConfig:
    columns:
        - in-progress
        - review
        - done
---
