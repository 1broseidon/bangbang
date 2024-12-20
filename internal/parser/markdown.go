package parser

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/yourusername/bangbang/internal/models"
)

// Parser handles reading and parsing markdown files
type Parser struct {
	rootDir string
}

// NewParser creates a new markdown parser instance
func NewParser(rootDir string) *Parser {
	return &Parser{
		rootDir: rootDir,
	}
}

// ParseDirectory reads all markdown files in the directory and returns a Board
func (p *Parser) ParseDirectory() (*models.Board, error) {
	files, err := os.ReadDir(p.rootDir)
	if err != nil {
		return nil, err
	}

	columns := []models.Column{}
	
	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".md") {
			content, err := os.ReadFile(filepath.Join(p.rootDir, file.Name()))
			if err != nil {
				return nil, err
			}

			// Simple parsing for now - split by # for headers
			parts := strings.Split(string(content), "#")
			columnTitle := strings.TrimSuffix(file.Name(), ".md")
			cards := []models.Card{}

			for _, part := range parts[1:] { // Skip first empty part
				lines := strings.Split(strings.TrimSpace(part), "\n")
				if len(lines) > 0 {
					cards = append(cards, models.Card{
						Title:       strings.TrimSpace(lines[0]),
						Description: strings.TrimSpace(strings.Join(lines[1:], "\n")),
						Column:      columnTitle,
					})
				}
			}

			columns = append(columns, models.Column{
				ID:    columnTitle,
				Title: strings.Title(strings.ReplaceAll(columnTitle, "-", " ")),
				Cards: cards,
			})
		}
	}

	return &models.Board{
		Title:   "My Board",
		Columns: columns,
	}, nil
}

// ParseFile reads a single markdown file and returns a Card
func (p *Parser) ParseFile(path string) (*models.Card, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	// Simple parsing for now
	parts := strings.Split(string(content), "#")
	if len(parts) < 2 {
		return nil, nil
	}

	lines := strings.Split(strings.TrimSpace(parts[1]), "\n")
	return &models.Card{
		Title:       strings.TrimSpace(lines[0]),
		Description: strings.TrimSpace(strings.Join(lines[1:], "\n")),
		FilePath:    path,
	}, nil
}
