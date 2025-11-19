# BangBang

A Task Description Language (TDL) for humans and AI agents.

## What is BangBang?

BangBang is a protocol, not an app. It's a simple YAML-based format for describing project tasks and rules in a single `.bangbang.md` file. The file is both human-readable and machine-parseable, making it ideal for version control, AI collaboration, and team coordination.

## The Protocol

A `.bangbang.md` file contains YAML frontmatter with three sections:

1. **title**: Project name
2. **rules**: Project guidelines (always, never, prefer, context)
3. **columns**: Task columns with tasks

Example:

```yaml
---
title: My Project
rules:
  always:
    - id: 1
      rule: update task status as you work (todo → in-progress → done)
  never:
    - id: 1
      rule: bypass YAML frontmatter structure
  prefer:
    - id: 1
      rule: simple solutions over complex abstractions
  context:
    - id: 1
      rule: task IDs follow pattern task-N
columns:
  - id: todo
    title: To Do
    tasks:
      - id: task-1
        title: Example task
        description: Task description here
  - id: done
    title: Done
    tasks: []
---
```

## Tooling

### VSCode Extension (Primary)

Install the extension directly:

```bash
code --install-extension vscode-extension/bangbang-0.3.0.vsix
```

Features:
- Kanban board view in VSCode sidebar
- Drag-and-drop task management
- Real-time bidirectional sync with .bangbang.md
- Quick Add Task (Cmd/Ctrl+Shift+T or + buttons)
- Subtasks with visual progress tracking
- Archive system for completed tasks
- Tab navigation (Tasks/Rules/Archive/Settings)
- Collapsible columns
- Rules display

### Schema

See [.bangbang.schema.json](.bangbang.schema.json) for the complete specification.

## Philosophy

- **Protocol-first**: The `.bangbang.md` spec is the product
- **Tool-agnostic**: Any tool can implement the protocol
- **Version control native**: Plain text, git-friendly
- **AI-native**: Designed for human-AI collaboration
- **No lock-in**: Just markdown and YAML

## Example

See [example/.bangbang.md](example/.bangbang.md) for a real-world example.

## License

MIT
