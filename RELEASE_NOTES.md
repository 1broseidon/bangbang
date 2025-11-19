# Release Notes

## v0.4.1 - AI-Ready Protocol (Latest)

### Protocol Enhancements
- **Protocol Versioning** - Added `protocolVersion` field to schema for backward compatibility
- **AI-Friendly Fields** - New task fields for AI planning:
  - `effort`: Task size estimation (trivial/small/medium/large/xlarge)
  - `blockedBy`: Task dependency tracking with task ID references
  - `llmNotes`: Free-form AI guidance at board level
- **Formalized ID Patterns** - Strict validation for task and column IDs

### VSCode Extension Improvements
- **Debounced Writes** - 300ms write debouncing prevents file conflicts when multiple agents/humans edit simultaneously
- **Conflict Detection** - Warns when external changes conflict with pending writes
- **Performance** - Reduced file system operations for better responsiveness

### Documentation
- **Enhanced Protocol Spec** - Comprehensive protocol.md with v0.4.0 changes
- **CONTRIBUTING.md** - Complete contribution guide for protocol, extension, and CLI
- **Version History** - Clear migration path and compatibility notes

### Developer Experience
- Schema now at `https://bangbang.dev/schema/v0.4.0`
- Better AI agent integration with structured fields
- Improved git-friendliness with conflict prevention

## v0.4.0 - Protocol Evolution

### Breaking Changes
- Default to non-hidden files (`bangbang.md` instead of `.bangbang.md`)
- Agent instruction block now recommended in YAML frontmatter

### New Features
- **Non-hidden files** - Better visibility and AI agent compatibility
- **Agent instructions** - Guide AI behavior with explicit rules
- **README load snippet** - Automatic context loading for AI agents
- **Full documentation** - Protocol spec and AI integration guides

### Improvements
- Backward compatibility maintained for hidden files
- Smart file discovery with priority order
- Dynamic archive file naming
- Enhanced JSON schema validation

### Migration
- Rename `.bangbang.md` → `bangbang.md` (optional)
- Add `<!-- load:bangbang.md -->` to README
- Include agent instruction block for AI guidance

## v0.3.0 - Quick Add & Subtasks

### New Features
- **Quick Add Task** (`Cmd/Ctrl+Shift+T`) - Add tasks without leaving your code
- **Subtasks with Progress** - Visual progress bars and interactive checkboxes
- **Plus Buttons** - Quick task creation from column headers
- **Smart Task IDs** - Auto-generated sequential IDs

### Improvements
- Fixed task state preservation during updates
- Enhanced real-time sync reliability
- Better UX for task interactions

### Technical
- Updated JSON schema with subtask support
- Improved TypeScript types
- Better state management

## v0.2.0 - Foundation Release

### Core Features
- Real-time bidirectional sync
- Drag-and-drop task management
- Archive system
- File watching with debounced updates
- CSP security

## Installation

Download the latest release from the [GitHub Releases page](https://github.com/1broseidon/bangbang/releases/latest), then:

```bash
code --install-extension bangbang-VERSION.vsix
```

Replace `VERSION` with the version number you downloaded.

## Upgrade Notes

If upgrading from v0.3.0 or earlier:
- Your existing `.bangbang.md` files are fully compatible
- Consider renaming to `bangbang.md` for better AI compatibility
- Add the agent instruction block for consistent AI behavior
- All features remain backward compatible