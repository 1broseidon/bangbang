# BangBang 🎯

<!-- load:bangbang.md -->

A Task Description Language (TDL) for AI-assisted development.

## What is BangBang?

BangBang is a protocol-first task management system designed for the AI era. It uses a simple YAML-based format in `bangbang.md` files that both humans and AI agents can read, write, and collaborate through. Think of it as a shared language for project management between you and your AI coding assistant.

> **Note**: The `<!-- load:bangbang.md -->` tag at the top of this README ensures AI agents automatically load your project's task board. This creates seamless context awareness for AI-assisted development.

## The Protocol

A `bangbang.md` file contains YAML frontmatter with these sections:

1. **title**: Project name
2. **agent**: Instructions for AI agents (optional but recommended)
3. **rules**: Project guidelines (always, never, prefer, context)
4. **columns**: Task columns with tasks

Example:

```yaml
---
title: My Project
agent:
  instructions:
    - Modify only the YAML frontmatter
    - Preserve all IDs
    - Keep ordering
    - Make minimal changes
    - Preserve unknown fields
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

## Installation

### VSCode Extension

Download the latest `.vsix` file from the [releases page](https://github.com/1broseidon/bangbang/releases/latest) and install:

```bash
code --install-extension bangbang-VERSION.vsix
```

Replace `VERSION` with the version number you downloaded.

## Features

### 🎯 AI-First Design

- **Protocol-based**: The `bangbang.md` file is the source of truth
- **Human-readable**: Simple YAML that's easy to edit directly
- **AI-compatible**: Designed for AI agents to read and modify
- **Version control friendly**: Plain text that works perfectly with git
- **Agent instructions**: Optional guidance to ensure consistent AI behavior

### 🚀 VSCode Integration

- **Real-time sync**: Changes to `bangbang.md` instantly update the UI
- **Backward compatible**: Works with both `bangbang.md` and `.bangbang.md` files
- **Drag-and-drop**: Visual task management with kanban boards
- **Quick Add**: `Cmd/Ctrl+Shift+T` to add tasks instantly
- **Subtasks**: Break down complex tasks with progress tracking
- **Archive system**: Keep completed tasks for reference

### 🎨 Modern UX

- **True-black theme**: Designed for modern OLED displays
- **Minimalist design**: Focus on content, not chrome
- **Collapsible sections**: Organize your workspace
- **Tab navigation**: Switch between Tasks, Rules, Archive, and Settings

## Why BangBang?

Traditional task management tools create silos between human planning and AI execution. BangBang bridges this gap with a simple protocol that both parties understand natively.

- **AI agents can read your tasks** and understand project context through rules
- **You maintain control** with a simple text file in your repository
- **No vendor lock-in** - it's just YAML in markdown
- **Perfect for AI pair programming** where the AI helps execute your plan

## Migration Guide

### From Hidden to Non-Hidden Files

Starting with v0.4.0, BangBang uses non-hidden files by default (`bangbang.md` instead of `.bangbang.md`). This improves:

- **Visibility**: Files are immediately visible in file explorers
- **AI Compatibility**: Many AI agents have better access to non-hidden files
- **Onboarding**: New developers can see the task board immediately

#### How to Migrate

1. **Rename your files** (optional):

   ```bash
   mv .bangbang.md bangbang.md
   mv .bangbang-archive.md bangbang-archive.md
   ```

2. **Update your README** (recommended):
   Add `<!-- load:bangbang.md -->` at the top to enable automatic AI agent loading

3. **Add agent instructions** (recommended):
   Include the `agent:` block in your YAML to guide AI behavior

> **Note**: The VSCode extension supports both formats. If both exist, `bangbang.md` takes priority.

## Schema

The complete protocol specification: [bangbang.schema.json](bangbang.schema.json)

## Example

Check out a real project using BangBang: [example/bangbang.md](example/bangbang.md)

## Contributing

BangBang is a protocol, not a product. We welcome:

- Tools that implement the protocol
- Improvements to the schema
- Documentation and examples

## License

MIT - Use it however you want
