package parser

import (
	"os"
	"path/filepath"

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
	// TODO: Implement markdown parsing
	return &models.Board{
		Title:   "My Board",
		Columns: []models.Column{},
	}, nil
}

// ParseFile reads a single markdown file and returns a Card
func (p *Parser) ParseFile(path string) (*models.Card, error) {
	// TODO: Implement single file parsing
	return nil, nil
}
