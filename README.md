# 💥 BangBang

[![Go Report Card](https://goreportcard.com/badge/github.com/1broseidon/bangbang)](https://goreportcard.com/report/github.com/1broseidon/bangbang)
[![Go Reference](https://pkg.go.dev/badge/github.com/1broseidon/bangbang.svg)](https://pkg.go.dev/github.com/1broseidon/bangbang)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

BangBang is a lightweight, portable Kanban board that lives in your project directory. It uses a single markdown file (`.bangbang.md`) to store your board's data, making it perfect for version control and easy sharing with your team.

![Example Project](example_project.png)

## ✨ Features

- 🚀 **Instant Setup**: Just run `bangbang` in any directory to create a new board
- 📁 **Directory-Specific Boards**: Each directory can have its own `.bangbang.md` board
- 🎯 **Markdown-Based**: All data stored in a simple, version-control friendly format
- 🖥️ **Modern Web UI**: Drag-and-drop interface with mobile support
- 🎨 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🔄 **Real-time Updates**: Changes are instantly saved to the markdown file
- 🌐 **Local Server**: Runs on `localhost`, no external dependencies needed

## 🚀 Quick Start

Install bangbang using the install script (recommended):

```bash
curl -fsSL https://raw.githubusercontent.com/1broseidon/bangbang/main/scripts/install.sh | bash
```

Or using Go (requires Go 1.23.4 or later):

```bash
go install github.com/1broseidon/bangbang@latest
```

Run it:

```bash
# Run in any directory
bangbang

# Or specify a custom directory and port
bangbang -d /path/to/project -p 8080
```

## 💡 Usage

1. Navigate to your project directory
2. Run `bangbang`
3. Open `http://localhost:9000` in your browser
4. Start organizing your tasks!

The board data is stored in `.bangbang.md` in your current directory. This file can be committed to version control, allowing you to track changes and share the board with your team.

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/1broseidon/bangbang.git

# Install dependencies
go mod download

# Run the server
go run main.go
```

## 🎯 Why BangBang?

- **Simple**: No databases, no cloud storage, just a markdown file
- **Portable**: Run it anywhere Go is installed
- **Version Control Friendly**: Track board changes in git
- **Team Friendly**: Share boards via your existing version control
- **Offline First**: Everything runs locally
- **Privacy Focused**: Your data never leaves your machine

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
