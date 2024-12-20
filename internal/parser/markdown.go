package parser

import (
	"bytes"
	"fmt"
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

	// Reorder the columns based on columnIDs
	colMap := make(map[string]models.Column, len(board.Columns))
	for _, c := range board.Columns {
		colMap[c.ID] = c
	}

	newColumns := make([]models.Column, 0, len(columnIDs))
	for _, cid := range columnIDs {
		col, ok := colMap[cid]
		if !ok {
			return fmt.Errorf("column %s not found", cid)
		}
		newColumns = append(newColumns, col)
	}

	if len(newColumns) != len(board.Columns) {
		return fmt.Errorf("missing columns in reorder request")
	}
	board.Columns = newColumns
	return p.writeBoard(board)
}

func (p *Parser) UpdateCardsOrder(columnID string, taskIDs []string) error {
	board, err := p.ParseBoard()
	if err != nil {
		return err
	}

	var targetColumnIndex = -1
	for i, col := range board.Columns {
		if col.ID == columnID {
			targetColumnIndex = i
			break
		}
	}

	if targetColumnIndex == -1 {
		return fmt.Errorf("column %s not found", columnID)
	}

	// Reorder tasks inside the target column
	column := board.Columns[targetColumnIndex]

	// Create a map of tasks by ID in the column
	taskMap := make(map[string]models.Task, len(column.Tasks))
	for _, t := range column.Tasks {
		taskMap[t.ID] = t
	}

	newTasks := make([]models.Task, 0, len(taskIDs))
	for _, tid := range taskIDs {
		t, ok := taskMap[tid]
		if !ok {
			return fmt.Errorf("task %s not found in column %s", tid, columnID)
		}
		newTasks = append(newTasks, t)
	}

	// Check if we didn't miss any tasks
	if len(newTasks) != len(column.Tasks) {
		return fmt.Errorf("mismatch in tasks count for reorder request in column %s", columnID)
	}

	board.Columns[targetColumnIndex].Tasks = newTasks

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
