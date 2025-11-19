# BangBang

Task management protocol for AI-assisted development.

## Features

- View and manage tasks from `.bangbang.md` files
- Organize tasks in customizable columns
- Define project rules (always, never, prefer, context)
- Drag and drop tasks between columns
- Live updates when editing the markdown file
- Collapsible task sections
- Progress tracking

## Usage

1. Create a `.bangbang.md` file in your project root
2. Open the folder in VSCode
3. The BangBang sidebar will appear automatically
4. View and manage your tasks

## File Format

Tasks are defined in YAML frontmatter:

```yaml
---
title: My Project
rules:
  always:
    - id: 1
      rule: write tests for all new features
  never:
    - id: 1
      rule: commit directly to main branch
columns:
  - id: todo
    title: To Do
    tasks:
      - id: task-1
        title: Task Title
        description: Task description
---
```
