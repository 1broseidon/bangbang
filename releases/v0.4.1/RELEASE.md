# BangBang v0.4.1 - AI-Ready Protocol

Release Date: 2025-11-18

## 🎯 Highlights

This release focuses on making BangBang more robust for AI agent collaboration with protocol versioning, AI-friendly task fields, and conflict prevention in the VSCode extension.

## 📦 Installation

### VSCode Extension
1. Download `bangbang-0.4.1.vsix` from this release
2. In VSCode, run: `Extensions: Install from VSIX...`
3. Select the downloaded file

Or install via command line:
```bash
code --install-extension bangbang-0.4.1.vsix
```

## ✨ What's New

### Protocol Enhancements

#### Protocol Versioning
- Added `protocolVersion` field to schema for explicit version tracking
- Enables backward compatibility as the protocol evolves
- Schema now versioned at `https://bangbang.dev/schema/v0.4.0`

#### AI-Friendly Task Fields
- **`effort`**: Task size estimation (trivial/small/medium/large/xlarge)
- **`blockedBy`**: Array of task IDs that block this task
- **`llmNotes`**: Board-level free-form notes for AI guidance

#### Strict ID Validation
- Task IDs must follow pattern: `task-N` (e.g., task-1, task-42)
- Column IDs must be kebab-case: `^[a-z]+(-[a-z]+)*$`
- Enables precise AI commands like "move task-42 to done"

### VSCode Extension Improvements

#### Debounced Writes
- 300ms write debouncing prevents file conflicts
- Essential for multi-agent collaboration
- Reduces file system operations

#### Conflict Detection
- Warns when external changes conflict with pending writes
- Helps prevent data loss when multiple tools edit simultaneously

### Documentation

- **Enhanced Protocol Spec**: Comprehensive `docs/protocol.md` with all v0.4.0 changes
- **CONTRIBUTING.md**: Complete contribution guide for protocol, extension, and CLI
- **Version History**: Clear migration paths and compatibility notes

## 📝 Example with New Features

```yaml
---
title: My AI-Assisted Project
protocolVersion: "0.4.1"
agent:
  instructions:
    - Modify only the YAML frontmatter
    - Preserve all IDs
  llmNotes: "This project prefers functional programming and comprehensive tests"
columns:
  - id: todo
    title: To Do
    tasks:
      - id: task-1
        title: Implement authentication
        priority: high
        effort: large
        blockedBy: []
      - id: task-2
        title: Add user profile
        priority: medium
        effort: medium
        blockedBy: ["task-1"]
---
```

## 🔄 Migration from v0.4.0

This is a backward-compatible release. Existing boards will continue to work. To use new features:

1. Add `protocolVersion: "0.4.1"` to your frontmatter
2. Use new fields as needed (effort, blockedBy, llmNotes)
3. VSCode extension will automatically use debounced writes

## 🐛 Bug Fixes

- Improved file write reliability in VSCode extension
- Better handling of concurrent edits

## 📚 Documentation

- Protocol specification: [docs/protocol.md](../../docs/protocol.md)
- Contributing guide: [CONTRIBUTING.md](../../CONTRIBUTING.md)
- Schema: [bangbang.schema.json](../../bangbang.schema.json)

## 🙏 Acknowledgments

Thanks to the external reviewer who provided strategic insights that shaped this release's AI-focused enhancements.

## 📄 License

MIT License - See [LICENSE](../../LICENSE) file for details.