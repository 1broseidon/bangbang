# Release Notes

## v0.3.0 - Quick Add & Subtasks (Latest)

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
code --install-extension bangbang-0.3.0.vsix
```

## Upgrade Notes

If upgrading from v0.2.0, your existing `.bangbang.md` files are fully compatible. The new subtasks feature is optional and won't affect existing tasks.