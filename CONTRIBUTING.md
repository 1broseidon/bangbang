# Contributing to BangBang

Thank you for your interest in contributing to BangBang! As a protocol-first project, we welcome contributions that enhance the protocol, improve tooling, or expand documentation.

## Quick Start

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test` in vscode-extension/)
5. Commit with clear messages (`git commit -m 'feat: add new field to schema'`)
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Project Structure

```
bangbang/
├── bangbang.schema.json    # Protocol schema definition
├── docs/                   # Documentation
│   └── protocol.md        # Protocol specification
├── vscode-extension/       # VSCode extension implementation
│   ├── src/               # TypeScript source
│   └── package.json       # Extension manifest
├── bangbang-cli/          # CLI implementation (Go)
├── example/               # Example boards
└── bangbang.md           # Dogfooding - this project's board
```

## Types of Contributions

### Protocol Changes

Changes to the BangBang protocol require careful consideration:

1. **Propose First**: Open an issue describing the change
2. **Update Schema**: Modify `bangbang.schema.json`
3. **Version Bump**: Update `protocolVersion` in schema
4. **Update Docs**: Modify `docs/protocol.md`
5. **Add Tests**: Ensure parsers handle the change
6. **Backward Compatibility**: Consider impact on existing tools

Example PR title: `feat(protocol): add effort field for AI planning`

### VSCode Extension

Improvements to the VSCode extension:

1. **Features**: New UI capabilities, commands, or views
2. **Bug Fixes**: Issues with parsing, syncing, or display
3. **Performance**: Optimizations for large boards
4. **UX**: Improvements to user experience

Development:
```bash
cd vscode-extension
npm install
npm run compile
# Press F5 in VSCode to test
```

### CLI Tool

Enhancements to the command-line interface:

1. **Commands**: New CLI commands
2. **Validation**: Schema validation improvements
3. **Integration**: Support for CI/CD pipelines

Development:
```bash
cd bangbang-cli
go build
./bangbang validate ../example/bangbang.md
```

### Documentation

We value clear, concise documentation:

1. **Protocol Docs**: Clarifications or examples
2. **Tool Guides**: How to use specific tools
3. **Integration Guides**: Using BangBang with AI agents
4. **Examples**: Real-world usage patterns

## Coding Standards

### TypeScript (VSCode Extension)

- Use TypeScript strict mode
- Follow existing code style
- Add JSDoc comments for public APIs
- Keep functions focused and small
- Use meaningful variable names

### Go (CLI)

- Follow [Effective Go](https://golang.org/doc/effective_go)
- Use `go fmt` before committing
- Add tests for new functionality
- Keep error handling explicit

### Schema Changes

- Maintain backward compatibility when possible
- Use semantic versioning for protocol versions
- Document all fields clearly
- Provide sensible defaults

## Commit Message Convention

We follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

Include scope when relevant:
- `feat(protocol):` Protocol changes
- `fix(vscode):` VSCode extension fixes
- `docs(cli):` CLI documentation

## Testing

### VSCode Extension
```bash
cd vscode-extension
npm test
```

### CLI
```bash
cd bangbang-cli
go test ./...
```

### Schema Validation
```bash
# Validate example files against schema
npx ajv validate -s bangbang.schema.json -d example/bangbang.md --spec=draft7
```

## Pull Request Process

1. **Small PRs**: Keep changes focused and reviewable
2. **Clear Description**: Explain what and why
3. **Link Issues**: Reference related issues
4. **Update Docs**: Include documentation updates
5. **Pass Tests**: Ensure all tests pass
6. **Request Review**: Tag maintainers when ready

## Issue Templates

When creating issues, please use appropriate labels:

- `protocol`: Schema or specification changes
- `vscode`: VSCode extension issues
- `cli`: CLI tool issues
- `bug`: Something isn't working
- `enhancement`: New feature request
- `documentation`: Documentation improvements

## Community Guidelines

- Be respectful and constructive
- Help others in discussions
- Share your use cases and experiences
- Suggest improvements based on real needs
- Credit others' contributions

## Development Tips

### Working with the Protocol

1. Always validate changes against existing files
2. Consider AI agent compatibility
3. Keep human readability paramount
4. Test with both hidden and non-hidden files

### Debugging VSCode Extension

1. Use VSCode's Extension Host debugging
2. Check Developer Tools console (Help > Toggle Developer Tools)
3. Enable verbose logging in extension settings
4. Test with various board configurations

### Protocol Evolution

When proposing protocol changes, consider:

1. **Use Cases**: Real problems being solved
2. **Alternatives**: Other ways to achieve the goal
3. **Migration**: How existing files will upgrade
4. **Tooling Impact**: Changes needed in tools
5. **AI Compatibility**: How agents will use the feature

## Getting Help

- **Discord**: [Join our community](https://discord.gg/bangbang) (if available)
- **Issues**: Check existing issues or create new ones
- **Discussions**: Use GitHub Discussions for questions
- **Twitter**: Follow [@bangbangproto](https://twitter.com/bangbangproto) for updates

## Recognition

Contributors are recognized in:
- Release notes
- Contributors section in README
- Git history (with Co-authored-by tags when appropriate)

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see LICENSE file).

---

Thank you for helping make BangBang better! Your contributions, whether code, documentation, or ideas, are valuable to the community.