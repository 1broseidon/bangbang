package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/yourusername/bangbang/internal/parser"
)

// Handler holds references to dependencies required by HTTP handlers
type Handler struct {
	Parser *parser.Parser
}

// ColumnOrderRequest defines expected JSON for reordering columns
type ColumnOrderRequest struct {
	Columns []string `json:"columns"`
}

// CardOrderRequest defines expected JSON for reordering cards
type CardOrderRequest struct {
	Cards []string `json:"cards"`
}

// UpdateColumnsOrder handles PUT /api/columns/order
func (h *Handler) UpdateColumnsOrder(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ColumnOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	if err := h.Parser.UpdateColumnsOrder(req.Columns); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// UpdateCardsOrder handles PUT /api/columns/{columnID}/cards/order
func (h *Handler) UpdateCardsOrder(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract columnID from path
	path := strings.TrimPrefix(r.URL.Path, "/api/columns/")
	parts := strings.Split(path, "/")
	if len(parts) < 3 || parts[1] != "cards" || parts[2] != "order" {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}
	columnID := parts[0]

	var req CardOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	if err := h.Parser.UpdateCardsOrder(columnID, req.Cards); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
