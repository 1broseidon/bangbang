package main

import (
	"flag"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"

	"github.com/yourusername/bangbang/internal/parser"
)

func main() {
	dirPath := flag.String("dir", ".", "Directory path containing markdown files")
	port := flag.String("port", "8080", "Port to run the server on")
	flag.Parse()

	if _, err := os.Stat(*dirPath); os.IsNotExist(err) {
		log.Fatalf("Directory %s does not exist", *dirPath)
	}

	p := parser.NewParser(*dirPath)
	
	// Serve static files
	fs := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	// Handle main page
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		board, err := p.ParseDirectory()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		tmpl, err := template.ParseFiles("templates/board.html")
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
	fmt.Printf("Server running at http://localhost:%s\n", *port)
	log.Fatal(http.ListenAndServe(":"+*port, nil))
}
