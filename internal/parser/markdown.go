package parser

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/yourusername/bangbang/internal/models"
	"gopkg.in/yaml.v3"
)

type Parser struct {
	boardFilePath string
}

func NewParser(dir string) *Parser {
	// Assume board.md is located in this directory
	boardFile := filepath.Join(dir, "board.md")
	return &Parser{
		boardFilePath: boardFile,
	}
}

func (p *Parser) ParseBoard() (*models.Board, error) {
	content, err := os.ReadFile(p.boardFilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read board file: %w", err)
	}

	var board models.Board
	if err := p.extractBoardFromFrontMatter(content, &board); err != nil {
		return nil, err
	}

	return &board, nil
}

func (p *Parser) UpdateColumnsOrder(columnIDs []string) error {
	board, err := p.ParseBoard()
	if err != nil {
		return err
	}

	// Create a lookup for column positions
	colMap := make(map[string]*models.Column)
	for i := range board.Columns {
		col := &board.Columns[i]
		colMap[col.ID] = col
	}

	// Create new ordered slice of columns
	newCols := make([]models.Column, 0, len(columnIDs))
	for _, cid := range columnIDs {
		col, ok := colMap[cid]
		if !ok {
			return fmt.Errorf("column %s not found", cid)
		}
		newCols = append(newCols, *col)
	}

	// Only update if we have all columns
	if len(newCols) != len(board.Columns) {
		return fmt.Errorf("missing columns in reorder request")
	}

	board.Columns = newCols
	return p.writeBoard(board)
}

func (p *Parser) UpdateCardsOrder(columnID string, taskIDs []string) error {
	board, err := p.ParseBoard()
	if err != nil {
		return err
	}

	// Verify column exists
	var found bool
	for _, col := range board.Columns {
		if col.ID == columnID {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("column %s not found", columnID)
	}

	// Create a lookup for all tasks
	taskMap := make(map[string]*models.Task)
	for i := range board.Tasks {
		t := &board.Tasks[i]
		taskMap[t.ID] = t
	}

	// Update status for moved tasks
	for _, tid := range taskIDs {
		t, ok := taskMap[tid]
		if !ok {
			log.Printf("Warning: task %s not found during reorder", tid)
			continue
		}
		t.Status = columnID
	}

	return p.writeBoard(board)
}

func (p *Parser) extractBoardFromFrontMatter(content []byte, board *models.Board) error {
	lines := bytes.Split(content, []byte("\n"))
	if len(lines) < 3 {
		return fmt.Errorf("invalid board file: no frontmatter found")
	}

	if !bytes.Equal(bytes.TrimSpace(lines[0]), []byte("---")) {
		return fmt.Errorf("frontmatter start not found")
	}

	// Find end of frontmatter
	var end int
	for i := 1; i < len(lines); i++ {
		if bytes.Equal(bytes.TrimSpace(lines[i]), []byte("---")) {
			end = i
			break
		}
	}
	if end == 0 {
		return fmt.Errorf("frontmatter end not found")
	}

	// Extract and parse YAML content
	yamlContent := bytes.Join(lines[1:end], []byte("\n"))
	if err := yaml.Unmarshal(yamlContent, board); err != nil {
		return fmt.Errorf("failed to parse board frontmatter: %w", err)
	}
	return nil
}

func (p *Parser) writeBoard(board *models.Board) error {
	// Marshal board to YAML
	fm, err := yaml.Marshal(board)
	if err != nil {
		return fmt.Errorf("failed to marshal board: %w", err)
	}

	// Write with frontmatter delimiters
	var buf bytes.Buffer
	buf.WriteString("---\n")
	buf.Write(fm)
	buf.WriteString("---\n")

	return os.WriteFile(p.boardFilePath, buf.Bytes(), 0644)
}
