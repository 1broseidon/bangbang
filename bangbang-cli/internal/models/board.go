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

type Rule struct {
	ID   int    `yaml:"id"`
	Rule string `yaml:"rule"`
}

type Rules struct {
	Always  []Rule `yaml:"always,omitempty"`
	Never   []Rule `yaml:"never,omitempty"`
	Prefer  []Rule `yaml:"prefer,omitempty"`
	Context []Rule `yaml:"context,omitempty"`
}

type Board struct {
	Title   string   `yaml:"title"`
	Rules   *Rules   `yaml:"rules,omitempty"`
	Columns []Column `yaml:"columns"`
}
