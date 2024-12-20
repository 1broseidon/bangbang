package models

type Task struct {
	ID          string `yaml:"id"`
	Title       string `yaml:"title"`
	Description string `yaml:"description"`
}

type Column struct {
	ID    string `yaml:"id"`
	Title string `yaml:"title"`
	Tasks []Task `yaml:"tasks"`
}

type Board struct {
	Title   string   `yaml:"title"`
	Columns []Column `yaml:"columns"`
}
