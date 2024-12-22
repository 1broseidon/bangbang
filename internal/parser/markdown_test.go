package parser

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/1broseidon/bangbang/internal/models"
)

func setupTestParser(t *testing.T) (*Parser, string) {
	// Create a temporary directory for test files
	tmpDir, err := os.MkdirTemp("", "bangbang-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}

	return NewParser(tmpDir, true, false), tmpDir
}

func cleanupTest(t *testing.T, tmpDir string) {
	if err := os.RemoveAll(tmpDir); err != nil {
		t.Errorf("Failed to cleanup temp dir: %v", err)
	}
}

func TestNewParser(t *testing.T) {
	p, tmpDir := setupTestParser(t)
	defer cleanupTest(t, tmpDir)

	// Check if default board file was created
	boardPath := filepath.Join(tmpDir, ".bangbang.md")
	if _, err := os.Stat(boardPath); os.IsNotExist(err) {
		t.Error("Default board file was not created")
	}

	// Parse the board to verify default structure
	board, err := p.ParseBoard()
	if err != nil {
		t.Fatalf("Failed to parse default board: %v", err)
	}

	// Verify default columns
	expectedColumns := []string{"todo", "in-progress", "review", "done"}
	if len(board.Columns) != len(expectedColumns) {
		t.Errorf("Expected %d columns, got %d", len(expectedColumns), len(board.Columns))
	}

	for i, expectedID := range expectedColumns {
		if board.Columns[i].ID != expectedID {
			t.Errorf("Expected column ID %s, got %s", expectedID, board.Columns[i].ID)
		}
	}
}

func TestUpdateBoardTitle(t *testing.T) {
	p, tmpDir := setupTestParser(t)
	defer cleanupTest(t, tmpDir)

	newTitle := "Updated Board Title"
	if err := p.UpdateBoardTitle(newTitle); err != nil {
		t.Fatalf("Failed to update board title: %v", err)
	}

	board, err := p.ParseBoard()
	if err != nil {
		t.Fatalf("Failed to parse board after title update: %v", err)
	}

	if board.Title != newTitle {
		t.Errorf("Expected board title %s, got %s", newTitle, board.Title)
	}
}

func TestCreateCard(t *testing.T) {
	p, tmpDir := setupTestParser(t)
	defer cleanupTest(t, tmpDir)

	tests := []struct {
		name        string
		columnID    string
		title       string
		description string
		wantErr     bool
	}{
		{
			name:        "valid card creation",
			columnID:    "todo",
			title:       "Test Task",
			description: "Test Description",
			wantErr:     false,
		},
		{
			name:        "invalid column",
			columnID:    "nonexistent",
			title:       "Test Task",
			description: "Test Description",
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := p.CreateCard(tt.columnID, tt.title, tt.description)
			if (err != nil) != tt.wantErr {
				t.Errorf("CreateCard() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				board, err := p.ParseBoard()
				if err != nil {
					t.Fatalf("Failed to parse board after card creation: %v", err)
				}

				found := false
				for _, col := range board.Columns {
					if col.ID == tt.columnID {
						for _, task := range col.Tasks {
							if task.Title == tt.title && task.Description == tt.description {
								found = true
								break
							}
						}
					}
				}

				if !found {
					t.Error("Created card not found in board")
				}
			}
		})
	}
}

func TestUpdateCardsOrder(t *testing.T) {
	p, tmpDir := setupTestParser(t)
	defer cleanupTest(t, tmpDir)

	// Create test cards
	if err := p.CreateCard("todo", "Task 1", "Description 1"); err != nil {
		t.Fatalf("Failed to create test card 1: %v", err)
	}
	if err := p.CreateCard("todo", "Task 2", "Description 2"); err != nil {
		t.Fatalf("Failed to create test card 2: %v", err)
	}

	board, err := p.ParseBoard()
	if err != nil {
		t.Fatalf("Failed to parse board: %v", err)
	}

	var cardIDs []string
	for _, task := range board.Columns[0].Tasks {
		cardIDs = append(cardIDs, task.ID)
	}

	// Test reordering
	tests := []struct {
		name      string
		columnID  string
		cardOrder []string
		wantErr   bool
	}{
		{
			name:      "valid reorder",
			columnID:  "todo",
			cardOrder: []string{cardIDs[1], cardIDs[0]}, // Reverse order
			wantErr:   false,
		},
		{
			name:      "invalid column",
			columnID:  "nonexistent",
			cardOrder: cardIDs,
			wantErr:   true,
		},
		{
			name:      "invalid card ID",
			columnID:  "todo",
			cardOrder: []string{"invalid-id"},
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := p.UpdateCardsOrder(tt.columnID, tt.cardOrder)
			if (err != nil) != tt.wantErr {
				t.Errorf("UpdateCardsOrder() error = %v, wantErr %v", err, tt.wantErr)
			}

			if !tt.wantErr {
				board, err := p.ParseBoard()
				if err != nil {
					t.Fatalf("Failed to parse board after reorder: %v", err)
				}

				var column *models.Column
				for i := range board.Columns {
					if board.Columns[i].ID == tt.columnID {
						column = &board.Columns[i]
						break
					}
				}

				if column == nil {
					t.Fatal("Column not found")
				}

				actualOrder := make([]string, len(column.Tasks))
				for i, task := range column.Tasks {
					actualOrder[i] = task.ID
				}

				if !reflect.DeepEqual(actualOrder, tt.cardOrder) {
					t.Errorf("Card order mismatch: got %v, want %v", actualOrder, tt.cardOrder)
				}
			}
		})
	}
}
