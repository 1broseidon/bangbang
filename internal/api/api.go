package api

import (
	"encoding/json"
	"fmt"
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

// UpdateColumnRequest defines expected JSON for updating column title
type UpdateColumnRequest struct {
	Title string `json:"title"`
}

// UpdateCardRequest defines expected JSON for updating card details
type UpdateCardRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// CreateCardRequest defines expected JSON for creating a new card
type CreateCardRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

type UpdateBoardTitleRequest struct {
	Title string `json:"title"`
}

// UpdateColumnsOrder handles PUT /api/columns/order
func (h *Handler) UpdateBoardTitle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req UpdateBoardTitleRequest
	if err := parseJSONBody(r, &req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.Parser.UpdateBoardTitle(req.Title); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

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

// ColumnsHandler routes requests for all column-related endpoints except /columns/order
func (h *Handler) ColumnsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/columns/")
	parts := strings.Split(path, "/")

	// Possible routes:
	// PUT /api/columns/{columnID} -> update column title
	// PUT /api/columns/{columnID}/cards/order -> update cards order
	// PUT /api/columns/{columnID}/cards/{cardID} -> update card details

	// PUT /api/columns/{columnID}/cards -> create new card
	// PUT /api/columns/{columnID}/cards/{cardID} -> update card details
	// PUT /api/columns/{columnID}/cards/order -> update cards order
	switch len(parts) {
	case 1:
		// Expect: PUT /api/columns/{columnID}
		columnID := parts[0]
		if columnID == "" {
			http.Error(w, "columnID required", http.StatusBadRequest)
			return
		}
		var req UpdateColumnRequest
		if err := parseJSONBody(r, &req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := h.Parser.UpdateColumnTitle(columnID, req.Title); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	case 2:
		// Expect: PUT /api/columns/{columnID}/cards
		columnID := parts[0]
		if parts[1] != "cards" {
			http.Error(w, "invalid path segment", http.StatusBadRequest)
			return
		}
		var req CreateCardRequest
		if err := parseJSONBody(r, &req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := h.Parser.CreateCard(columnID, req.Title, req.Description); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
	case 3:
		// Expect: PUT /api/columns/{columnID}/cards/{cardID}
		// or PUT /api/columns/{columnID}/cards/order
		columnID := parts[0]
		if parts[1] != "cards" {
			http.Error(w, "invalid path segment", http.StatusBadRequest)
			return
		}
		cardID := parts[2]

		if cardID == "order" {
			// Handle cards reordering
			var req CardOrderRequest
			if err := parseJSONBody(r, &req); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			if err := h.Parser.UpdateCardsOrder(columnID, req.Cards); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Handle card details update
		var req UpdateCardRequest
		if err := parseJSONBody(r, &req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := h.Parser.UpdateCardDetails(columnID, cardID, req.Title, req.Description); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		http.Error(w, "invalid path", http.StatusBadRequest)
	}
}

func parseJSONBody(r *http.Request, v interface{}) error {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		return fmt.Errorf("invalid JSON body: %w", err)
	}
	return nil
}
