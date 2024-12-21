package main

import (
	"embed"
	"fmt"
	"html/template"
	"io/fs"
	"log"
	"net/http"

	"github.com/1broseidon/bangbang/internal/api"
	"github.com/1broseidon/bangbang/internal/parser"
	"github.com/go-chi/chi/v5"
	"github.com/spf13/pflag"
)

var (
	version = "dev"
	date    = "unknown"
)

//go:embed templates/*
var templateFS embed.FS

//go:embed static/*
var staticFS embed.FS

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

	// Create main router
	r := chi.NewRouter()

	// Mount API routes under /api
	r.Mount("/api", h.Routes())

	// Serve static files from embedded filesystem
	staticSubFS, err := fs.Sub(staticFS, "static")
	if err != nil {
		log.Fatal(err)
	}
	fs := http.FileServer(http.FS(staticSubFS))
	r.Handle("/static/*", http.StripPrefix("/static/", fs))

	// Handle board view using embedded template
	tmpl := template.Must(template.ParseFS(templateFS, "templates/board.html"))
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
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

	fmt.Printf("Starting bangbang %s (%s)\n", version, date)
	fmt.Printf("Directory: %s\n", *dirPath)
	fmt.Printf("Server running at http://localhost:%d\n", *port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", *port), r))
}
