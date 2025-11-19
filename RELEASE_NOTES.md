# Release Notes

## v0.4.0 - Protocol Evolution (Latest)

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

```bash
code --install-extension bangbang-0.4.0.vsix
```

## Upgrade Notes

If upgrading from v0.3.0 or earlier:
- Your existing `.bangbang.md` files are fully compatible
- Consider renaming to `bangbang.md` for better AI compatibility
- Add the agent instruction block for consistent AI behavior
- All features remain backward compatible