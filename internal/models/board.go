package models

// Card represents a single card on the board
type Card struct {
	ID          string
	Title       string
	Description string
	Column      string
	Order       int
	FilePath    string // Path to source markdown file
}

// Column represents a column on the board
type Column struct {
	ID    string
	Title string
	Cards []Card
}

// Board represents the entire kanban board
type Board struct {
	Title   string
	Columns []Column
}
