package models

import (
	"time"
)

type Comment struct {
	ID        string    `yaml:"id"`
	Text      string    `yaml:"text"`
	CreatedAt time.Time `yaml:"created_at"`
}

type Task struct {
	ID          string    `yaml:"id"`
	Title       string    `yaml:"title"`
	Description string    `yaml:"description"`
	Comments    []Comment `yaml:"comments,omitempty"`
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
