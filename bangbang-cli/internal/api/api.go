package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/1broseidon/bangbang/internal/parser"
	"github.com/go-chi/chi/v5"
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

// UpdateBoardTitle handles PUT /board/title
func (h *Handler) UpdateBoardTitle(w http.ResponseWriter, r *http.Request) {
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

// UpdateColumnsOrder handles PUT /columns/order
func (h *Handler) UpdateColumnsOrder(w http.ResponseWriter, r *http.Request) {
	var req ColumnOrderRequest
	if err := parseJSONBody(r, &req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.Parser.UpdateColumnsOrder(req.Columns); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Routes sets up all API routes using chi router
func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()

	// Board routes
	r.Put("/board/title", h.UpdateBoardTitle)

	// Column routes
	r.Put("/columns/order", h.UpdateColumnsOrder)
	r.Put("/columns/{columnID}", h.UpdateColumnTitle)

	// Card routes
	r.Put("/columns/{columnID}/cards", h.CreateCard)
	r.Put("/columns/{columnID}/cards/order", h.UpdateCardsOrder)
	r.Put("/columns/{columnID}/cards/{cardID}", h.UpdateCardDetails)

	return r
}

// UpdateColumnTitle handles PUT /columns/{columnID}
func (h *Handler) UpdateColumnTitle(w http.ResponseWriter, r *http.Request) {
	columnID := chi.URLParam(r, "columnID")
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
}

// CreateCard handles PUT /columns/{columnID}/cards
func (h *Handler) CreateCard(w http.ResponseWriter, r *http.Request) {
	columnID := chi.URLParam(r, "columnID")
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
}

// UpdateCardsOrder handles PUT /columns/{columnID}/cards/order
func (h *Handler) UpdateCardsOrder(w http.ResponseWriter, r *http.Request) {
	columnID := chi.URLParam(r, "columnID")
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
}

// UpdateCardDetails handles PUT /columns/{columnID}/cards/{cardID}
func (h *Handler) UpdateCardDetails(w http.ResponseWriter, r *http.Request) {
	columnID := chi.URLParam(r, "columnID")
	cardID := chi.URLParam(r, "cardID")

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
}

func parseJSONBody(r *http.Request, v interface{}) error {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		return fmt.Errorf("invalid JSON body: %w", err)
	}
	return nil
}
