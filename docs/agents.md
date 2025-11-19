# BangBang AI Agent Integration Guide

## Overview

BangBang is designed from the ground up for AI agent compatibility. This guide explains how AI agents should interact with BangBang boards and best practices for integration.

## Quick Start for AI Agents

1. **Look for the load tag** in README files:
   ```html
   <!-- load:bangbang.md -->
   ```
   This tag indicates the project uses BangBang. Load the referenced file automatically.

2. **Check for board files** in this order:
   - `bangbang.md` (preferred)
   - `.bangbang.md` (backward compatibility)

3. **Follow agent instructions** in the YAML:
   ```yaml
   agent:
     instructions:
       - Modify only the YAML frontmatter
       - Preserve all IDs
       - Keep ordering
   ```

## File Discovery Algorithm

```python
def find_bangbang_file(project_root):
    # Priority order
    candidates = [
        'bangbang.md',        # New default (non-hidden)
        '.bangbang.md',       # Backward compatibility
        '.bb.md'              # Legacy shorthand
    ]

    for filename in candidates:
        path = os.path.join(project_root, filename)
        if os.path.exists(path):
            return path

    # Create new file using non-hidden format
    return create_default_board('bangbang.md')
```

## Understanding the Agent Block

The `agent` block provides explicit instructions for AI behavior:

```yaml
agent:
  instructions:
    - Modify only the YAML frontmatter
    - Preserve all IDs
    - Keep ordering
    - Make minimal changes
    - Preserve unknown fields
```

### Why These Instructions Matter

1. **Modify only the YAML frontmatter**: The content after `---` should never be modified
2. **Preserve all IDs**: Changing IDs breaks references and history
3. **Keep ordering**: Maintains visual consistency in UIs
4. **Make minimal changes**: Reduces merge conflicts and preserves user intent
5. **Preserve unknown fields**: Future-proofs against schema extensions

## Common AI Agent Operations

### Moving a Task Between Columns

```yaml
# BEFORE
columns:
  - id: todo
    tasks:
      - id: task-1
        title: Fix login bug
  - id: in-progress
    tasks: []

# AFTER (correct)
columns:
  - id: todo
    tasks: []
  - id: in-progress
    tasks:
      - id: task-1  # ID preserved
        title: Fix login bug
```

### Adding a New Task

```yaml
# Generate next ID by finding max existing ID
columns:
  - id: todo
    tasks:
      - id: task-5  # Existing max ID
        title: Existing task
      - id: task-6  # New task with next ID
        title: New task
```

### Updating Task Status with Subtasks

```yaml
tasks:
  - id: task-1
    title: Implement feature
    subtasks:
      - id: task-1-1
        title: Write tests
        completed: true  # Mark complete
      - id: task-1-2
        title: Update docs
        completed: false
```

## Best Practices for AI Agents

### DO:
- ✅ Load `bangbang.md` automatically when referenced
- ✅ Respect the agent instructions block
- ✅ Preserve all IDs and unknown fields
- ✅ Validate changes against the schema
- ✅ Provide clear feedback about changes made
- ✅ Move entire task objects (with all fields) between columns

### DON'T:
- ❌ Modify content outside YAML frontmatter
- ❌ Change or regenerate task IDs
- ❌ Remove fields you don't understand
- ❌ Create hidden files for new projects
- ❌ Ignore the priority order when multiple files exist

## Integration with VSCode Extension

The VSCode extension watches for file changes in real-time. AI agents should:

1. **Write atomic changes**: Complete all modifications before saving
2. **Preserve formatting**: Maintain YAML indentation (2 spaces)
3. **Handle conflicts**: Check for concurrent modifications
4. **Validate before saving**: Ensure YAML is valid

## Error Handling

### Common Issues and Solutions

1. **Invalid YAML**
   - Validate before writing
   - Preserve original on error
   - Report specific line numbers

2. **ID Conflicts**
   - Always check existing IDs
   - Use sequential numbering
   - Never reuse deleted IDs

3. **Schema Violations**
   - Validate against `bangbang.schema.json`
   - Preserve backward compatibility
   - Report unknown fields as warnings, not errors

## Compliance Checking

AI agents should self-verify compliance:

```python
def check_compliance(board):
    # Check agent instructions exist
    if 'agent' in board and 'instructions' in board['agent']:
        follow_instructions(board['agent']['instructions'])

    # Verify ID uniqueness
    all_ids = set()
    for column in board['columns']:
        for task in column['tasks']:
            if task['id'] in all_ids:
                raise ValueError(f"Duplicate ID: {task['id']}")
            all_ids.add(task['id'])

    # Validate against schema
    validate_against_schema(board, 'bangbang.schema.json')
```

## README Integration

The load tag pattern enables automatic context:

```markdown
# My Project

<!-- load:bangbang.md -->

This comment tells AI agents to automatically load the board file.
```

Benefits:
- No manual prompting needed
- Consistent context across sessions
- Works with any AI agent that parses HTML comments

## Migration Support

When encountering legacy hidden files:

1. **Suggest migration** to non-hidden format
2. **Support both formats** during transition
3. **Never force migration** without user consent
4. **Preserve exact structure** when migrating

## Example Agent Interaction

```
User: "Move the authentication task to in-progress"

AI Agent:
1. Loads bangbang.md (found via README tag)
2. Reads agent instructions
3. Finds task with "authentication" in title
4. Preserves entire task object
5. Moves task to in-progress column
6. Saves file with minimal changes
7. Reports: "Moved task-3 'Implement authentication' to In Progress"
```

## Testing Your Integration

Verify your AI agent correctly:

1. **Handles both file formats** (hidden and non-hidden)
2. **Respects priority order** when multiple files exist
3. **Follows agent instructions** exactly
4. **Preserves unknown fields** for future compatibility
5. **Generates valid YAML** that passes schema validation

## Future Compatibility

The protocol may extend with:
- Additional task fields
- New column types
- Extended agent instructions
- Custom metadata

AI agents must:
- Preserve unknown fields
- Not assume fixed schema
- Check for schema updates
- Gracefully handle extensions