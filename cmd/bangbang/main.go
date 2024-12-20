package main

import (
	"flag"
	"fmt"
	"html/template"
	"log"
	"net/http"

	"github.com/yourusername/bangbang/internal/api"
	"github.com/yourusername/bangbang/internal/parser"
)

func main() {
	dirPath := flag.String("dir", "./example", "Directory containing board.md")
	flag.Parse()

	// Create parser instance
	p := parser.NewParser(*dirPath)

	// Create API handler
	h := &api.Handler{
		Parser: p,
	}

	// Register API endpoints
	http.HandleFunc("/api/columns/order", h.UpdateColumnsOrder)
	http.HandleFunc("/api/columns/", h.UpdateCardsOrder)

	// Serve static files
	fs := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	// Handle board view
	tmpl := template.Must(template.ParseFiles("templates/board.html"))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		board, err := p.ParseBoard()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if err := tmpl.Execute(w, board); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	})

	fmt.Printf("Starting bangbang with directory: %s\n", *dirPath)
	fmt.Println("Server running at http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
