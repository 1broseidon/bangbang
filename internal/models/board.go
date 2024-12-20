package models

type Task struct {
	ID          string `yaml:"id"`
	Title       string `yaml:"title"`
	Description string `yaml:"description"`
	Status      string `yaml:"status"` // "todo", "in-progress", "done"
}

type Column struct {
	ID    string `yaml:"id"`
	Title string `yaml:"title"`
}

type Board struct {
	Title   string   `yaml:"title"`
	Tasks   []Task   `yaml:"tasks"`
	Columns []Column `yaml:"columns"`
}
