package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"

	"github.com/spf13/pflag"
	"github.com/yourusername/bangbang/internal/api"
	"github.com/yourusername/bangbang/internal/parser"
)

func main() {
	dirPath := pflag.StringP("dir", "d", ".", "Directory containing .bangbang.md")
	port := pflag.IntP("port", "p", 9000, "Port to run the server on")
	debug := pflag.BoolP("debug", "D", false, "Enable debug logging")
	pflag.Parse()

	// Create parser instance with debug flag
	p := parser.NewParser(*dirPath, *debug)

	// Create API handler
	h := &api.Handler{
		Parser: p,
	}

	// Register API endpoints
	http.HandleFunc("/api/board/title", h.UpdateBoardTitle)
	http.HandleFunc("/api/columns/order", h.UpdateColumnsOrder)
	http.HandleFunc("/api/columns/", h.ColumnsHandler)

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
	fmt.Printf("Server running at http://localhost:%d\n", *port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", *port), nil))
}
