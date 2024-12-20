package parser

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"

	"github.com/1broseidon/bangbang/internal/models"
	"gopkg.in/yaml.v3"
)

type Parser struct {
	boardFilePath string
	debug         bool
}

func NewParser(dir string, debug bool) *Parser {
	// Use .bangbang.md in the specified directory
	boardFile := filepath.Join(dir, ".bangbang.md")
	p := &Parser{
		boardFilePath: boardFile,
		debug:         debug,
	}

	// Create file if it doesn't exist
	if _, err := os.Stat(boardFile); os.IsNotExist(err) {
		defaultBoard := &models.Board{
			Title: "My Board",
			Columns: []models.Column{
				{ID: "todo", Title: "To Do", Tasks: []models.Task{}},
				{ID: "in-progress", Title: "In Progress", Tasks: []models.Task{}},
				{ID: "review", Title: "Review", Tasks: []models.Task{}},
				{ID: "done", Title: "Done", Tasks: []models.Task{}},
			},
		}
		if err := p.writeBoard(defaultBoard); err != nil && p.debug {
			fmt.Printf("Error creating default board: %v\n", err)
		}
	}

	return p
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
	if p.debug {
		fmt.Printf("Updating cards order - Column: %s, Tasks: %v\n", columnID, taskIDs)
	}

	board, err := p.ParseBoard()
	if err != nil {
		if p.debug {
			fmt.Printf("Error parsing board: %v\n", err)
		}
		return err
	}

	// Find target column
	var targetColumnIndex = -1
	for i, col := range board.Columns {
		if col.ID == columnID {
			targetColumnIndex = i
			break
		}
	}

	if targetColumnIndex == -1 {
		if p.debug {
			fmt.Printf("Error: Column %s not found\n", columnID)
		}
		return fmt.Errorf("column %s not found", columnID)
	}

	if p.debug {
		fmt.Printf("Found target column at index: %d\n", targetColumnIndex)
	}

	// Create a map of all tasks across all columns
	allTasks := make(map[string]models.Task)
	for _, col := range board.Columns {
		for _, t := range col.Tasks {
			allTasks[t.ID] = t
		}
	}

	// Build new task list for target column
	newTasks := make([]models.Task, 0, len(taskIDs))
	for _, tid := range taskIDs {
		t, ok := allTasks[tid]
		if !ok {
			return fmt.Errorf("task %s not found", tid)
		}
		newTasks = append(newTasks, t)
	}

	// Remove tasks that moved to target column from other columns
	for i := range board.Columns {
		if i == targetColumnIndex {
			continue
		}
		remainingTasks := make([]models.Task, 0)
		for _, t := range board.Columns[i].Tasks {
			found := false
			for _, tid := range taskIDs {
				if t.ID == tid {
					found = true
					break
				}
			}
			if !found {
				remainingTasks = append(remainingTasks, t)
			}
		}
		board.Columns[i].Tasks = remainingTasks
	}

	// Update target column with new task order
	if p.debug {
		fmt.Printf("Updating column %s with new task order: %v\n", columnID, taskIDs)
	}
	board.Columns[targetColumnIndex].Tasks = newTasks

	err = p.writeBoard(board)
	if err != nil {
		if p.debug {
			fmt.Printf("Error writing board: %v\n", err)
		}
		return err
	}

	if p.debug {
		fmt.Printf("Successfully updated cards order in column %s\n", columnID)
	}
	return nil
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

// UpdateColumnTitle updates the title of a column with the given ID
func (p *Parser) UpdateColumnTitle(columnID string, newTitle string) error {
	if p.debug {
		fmt.Printf("Updating column title - Column: %s, New Title: %s\n", columnID, newTitle)
	}

	board, err := p.ParseBoard()
	if err != nil {
		if p.debug {
			fmt.Printf("Error parsing board: %v\n", err)
		}
		return err
	}

	// Find and update the target column
	found := false
	for i := range board.Columns {
		if board.Columns[i].ID == columnID {
			board.Columns[i].Title = newTitle
			found = true
			break
		}
	}

	if !found {
		if p.debug {
			fmt.Printf("Error: Column %s not found\n", columnID)
		}
		return fmt.Errorf("column %s not found", columnID)
	}

	if p.debug {
		fmt.Printf("Successfully updated title for column %s\n", columnID)
	}
	return p.writeBoard(board)
}

// UpdateCardDetails updates the title and description of a card in the specified column
func (p *Parser) UpdateCardDetails(columnID string, cardID string, newTitle string, newDescription string) error {
	if p.debug {
		fmt.Printf("Updating card details - Column: %s, Card: %s\n", columnID, cardID)
	}

	board, err := p.ParseBoard()
	if err != nil {
		if p.debug {
			fmt.Printf("Error parsing board: %v\n", err)
		}
		return err
	}

	// Find the target column
	var targetColumn *models.Column
	for i := range board.Columns {
		if board.Columns[i].ID == columnID {
			targetColumn = &board.Columns[i]
			break
		}
	}

	if targetColumn == nil {
		if p.debug {
			fmt.Printf("Error: Column %s not found\n", columnID)
		}
		return fmt.Errorf("column %s not found", columnID)
	}

	// Find and update the target card
	found := false
	for i := range targetColumn.Tasks {
		if targetColumn.Tasks[i].ID == cardID {
			targetColumn.Tasks[i].Title = newTitle
			targetColumn.Tasks[i].Description = newDescription
			found = true
			break
		}
	}

	if !found {
		if p.debug {
			fmt.Printf("Error: Card %s not found in column %s\n", cardID, columnID)
		}
		return fmt.Errorf("card %s not found in column %s", cardID, columnID)
	}

	if p.debug {
		fmt.Printf("Successfully updated details for card %s in column %s\n", cardID, columnID)
	}
	return p.writeBoard(board)
}

// CreateCard adds a new card to the specified column
func (p *Parser) CreateCard(columnID string, title string, description string) error {
	if p.debug {
		fmt.Printf("Creating new card - Column: %s, Title: %s\n", columnID, title)
	}

	board, err := p.ParseBoard()
	if err != nil {
		if p.debug {
			fmt.Printf("Error parsing board: %v\n", err)
		}
		return err
	}

	// Find the target column
	var targetColumn *models.Column
	for i := range board.Columns {
		if board.Columns[i].ID == columnID {
			targetColumn = &board.Columns[i]
			break
		}
	}

	if targetColumn == nil {
		if p.debug {
			fmt.Printf("Error: Column %s not found\n", columnID)
		}
		return fmt.Errorf("column %s not found", columnID)
	}

	// Create new task with unique ID
	newTask := models.Task{
		ID:          fmt.Sprintf("task-%d", len(targetColumn.Tasks)+1),
		Title:       title,
		Description: description,
	}

	// Add task to column
	targetColumn.Tasks = append(targetColumn.Tasks, newTask)

	if p.debug {
		fmt.Printf("Successfully created new card %s in column %s\n", newTask.ID, columnID)
	}
	return p.writeBoard(board)
}

func (p *Parser) UpdateBoardTitle(newTitle string) error {
	board, err := p.ParseBoard()
	if err != nil {
		return err
	}

	board.Title = newTitle
	return p.writeBoard(board)
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
