# BangBang Protocol Specification

## Overview

BangBang is a protocol for task management designed specifically for AI-assisted software development. It defines a structured format for project tasks that both humans and AI agents can understand and modify.

## File Format

### Primary File: `bangbang.md`

The protocol uses a Markdown file with YAML frontmatter. The default filename is `bangbang.md` (non-hidden), though `.bangbang.md` (hidden) is supported for backward compatibility.

**Priority Order** (when multiple files exist):

1. `bangbang.md` (preferred)
2. `.bangbang.md` (backward compatibility)
3. `.bb.md` (shorthand, deprecated)

### Archive File: `bangbang-archive.md`

Completed tasks can be archived to `bangbang-archive.md` (or `.bangbang-archive.md` for hidden variant).

## YAML Structure

### Required Fields

```yaml
---
title: string # Project or board title
columns: [] # Array of task columns
---
```

### Optional Fields

```yaml
---
protocolVersion: string # Version of protocol (e.g., "0.4.0")
agent: # AI agent instructions (recommended)
  instructions: [] # Array of instruction strings
  llmNotes: string # Free-form notes about AI work preferences
rules: # Project rules and guidelines
  always: [] # Rules that must always be followed
  never: [] # Rules that must never be violated
  prefer: [] # Preferred approaches
  context: [] # Contextual information
archive: [] # Archived tasks (usually in separate file)
---
```

## Agent Instructions Block

The `agent` block provides explicit guidance to AI agents interacting with the board:

```yaml
agent:
  instructions:
    - Modify only the YAML frontmatter
    - Preserve all IDs
    - Keep ordering
    - Make minimal changes
    - Preserve unknown fields
```

This ensures consistent behavior across different AI agents and prevents destructive changes.

## Column Structure

Each column represents a workflow state:

```yaml
columns:
  - id: string # Unique identifier (kebab-case)
    title: string # Display title
    tasks: [] # Array of tasks
```

### Standard Column IDs

While customizable, these IDs are conventional:

- `todo` - Tasks to be started
- `in-progress` - Tasks being worked on
- `review` - Tasks pending review
- `done` - Completed tasks

## Task Structure

### Required Task Fields

```yaml
- id: string # Unique identifier (pattern: task-N)
  title: string # Task title
```

### Optional Task Fields

```yaml
description: string # Detailed description (markdown supported)
assignee: string # Person responsible
priority: string # low|medium|high|critical
effort: string # trivial|small|medium|large|xlarge
blockedBy: [] # Array of task IDs (e.g., ["task-1", "task-5"])
dueDate: string # ISO 8601 date
tags: [] # Array of tag strings
relatedFiles: [] # Array of file paths
subtasks: [] # Array of subtasks
template: string # bug|feature|refactor
```

## Subtask Structure

Subtasks track granular progress within a task:

```yaml
subtasks:
  - id: string # Pattern: task-N-M
    title: string # Subtask title
    completed: boolean # Completion status
```

## Rule Structure

Rules guide project behavior:

```yaml
rules:
  always:
    - id: number
      rule: string # Rule description
```

## Version Compatibility

### v0.4.0 (Latest)

- Added `protocolVersion` field for explicit versioning
- Added AI-friendly task fields: `effort`, `blockedBy`
- Added `llmNotes` field to agent block
- Task IDs now enforce `task-N` pattern

### v0.3.0

- Default to non-hidden files (`bangbang.md`)
- Added `agent` instruction block
- Maintains backward compatibility with hidden files
- Added subtasks support

### Migration Path

1. Projects can use either hidden or non-hidden files
2. Tools should check for both variants
3. Non-hidden files take priority when both exist

## Best Practices

1. **Use non-hidden files** for better visibility and AI compatibility
2. **Include agent instructions** to ensure consistent AI behavior
3. **Preserve IDs** when moving tasks between columns
4. **Use semantic IDs** (task-1, task-2) for easy reference
5. **Keep descriptions concise** but informative
6. **Archive completed tasks** to maintain board performance

## File Discovery

Tools implementing the protocol should:

1. Check for `bangbang.md` first
2. Fall back to `.bangbang.md` if not found
3. Create `bangbang.md` for new projects
4. Support both formats for existing projects

## Validation

Use the JSON Schema ([bangbang.schema.json](../bangbang.schema.json)) to validate YAML structure.

## Example

```yaml
---
title: My Project
protocolVersion: "0.4.0"
agent:
  instructions:
    - Modify only the YAML frontmatter
    - Preserve all IDs
    - Keep ordering
  llmNotes: "Prefer functional patterns and comprehensive tests"
rules:
  always:
    - id: 1
      rule: update task status as you work
columns:
  - id: todo
    title: To Do
    tasks:
      - id: task-1
        title: Implement user authentication
        description: Add OAuth2 support
        priority: high
        effort: large
        blockedBy: []
        subtasks:
          - id: task-1-1
            title: Setup OAuth provider
            completed: false
          - id: task-1-2
            title: Create login UI
            completed: false
---
```
