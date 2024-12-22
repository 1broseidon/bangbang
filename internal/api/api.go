package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/1broseidon/bangbang/internal/models"
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

// CreateCommentRequest defines expected JSON for creating a new comment
type CreateCommentRequest struct {
	Text string `json:"text"`
}

// CommentResponse defines JSON structure for comment details
type CommentResponse struct {
	ID        string    `json:"id"`
	Text      string    `json:"text"`
	CreatedAt time.Time `json:"created_at"`
}

// CardResponse defines JSON structure for card details
type CardResponse struct {
	ID          string            `json:"id"`
	Title       string            `json:"title"`
	Description string            `json:"description"`
	Comments    []CommentResponse `json:"comments,omitempty"`
}

// ColumnResponse defines JSON structure for column details
type ColumnResponse struct {
	ID    string         `json:"id"`
	Title string         `json:"title"`
	Tasks []CardResponse `json:"tasks"`
}

// BoardResponse defines JSON structure for board details
type BoardResponse struct {
	Title   string           `json:"title"`
	Columns []ColumnResponse `json:"columns"`
}

// CreateColumnRequest defines expected JSON for creating a new column
type CreateColumnRequest struct {
	Title string `json:"title"`
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

// ProjectListResponse defines JSON structure for project list
type ProjectListResponse struct {
	Projects []string `json:"projects"`
}

// Routes sets up all API routes using chi router
func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()

	// Project routes (only active with --multi-project flag)
	r.Get("/projects", h.ListProjects)
	r.Put("/projects/{name}", h.SwitchProject)

	// Board routes
	r.Get("/board", h.GetBoard)
	r.Put("/board/title", h.UpdateBoardTitle)

	// Column routes
	r.Post("/columns", h.CreateColumn) // New endpoint for creating columns
	r.Put("/columns/order", h.UpdateColumnsOrder)
	r.Get("/columns/{columnID}", h.GetColumn)       // New endpoint for getting column details
	r.Delete("/columns/{columnID}", h.DeleteColumn) // New endpoint for deleting columns
	r.Put("/columns/{columnID}", h.UpdateColumnTitle)

	// Card routes
	r.Post("/columns/{columnID}/cards", h.CreateCard)            // Changed from Put to Post for creation
	r.Get("/columns/{columnID}/cards/{cardID}", h.GetCard)       // New endpoint for getting card details
	r.Delete("/columns/{columnID}/cards/{cardID}", h.DeleteCard) // New endpoint for deleting cards
	r.Put("/columns/{columnID}/cards/order", h.UpdateCardsOrder)
	r.Put("/columns/{columnID}/cards/{cardID}", h.UpdateCardDetails)

	// Comment routes
	r.Post("/columns/{columnID}/cards/{cardID}/comments", h.CreateComment)
	r.Delete("/columns/{columnID}/cards/{cardID}/comments/{commentID}", h.DeleteComment)

	return r
}

// CreateComment handles POST /columns/{columnID}/cards/{cardID}/comments
func (h *Handler) CreateComment(w http.ResponseWriter, r *http.Request) {
	columnID := chi.URLParam(r, "columnID")
	cardID := chi.URLParam(r, "cardID")

	var req CreateCommentRequest
	if err := parseJSONBody(r, &req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.Parser.CreateComment(columnID, cardID, req.Text); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

// DeleteComment handles DELETE /columns/{columnID}/cards/{cardID}/comments/{commentID}
func (h *Handler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	columnID := chi.URLParam(r, "columnID")
	cardID := chi.URLParam(r, "cardID")
	commentID := chi.URLParam(r, "commentID")

	if err := h.Parser.DeleteComment(columnID, cardID, commentID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ListProjects handles GET /projects
func (h *Handler) ListProjects(w http.ResponseWriter, r *http.Request) {
	projects, err := h.Parser.ListProjects()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := ProjectListResponse{
		Projects: projects,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

// SwitchProject handles PUT /projects/{name}
func (h *Handler) SwitchProject(w http.ResponseWriter, r *http.Request) {
	projectName := chi.URLParam(r, "name")
	if projectName == "" {
		http.Error(w, "project name is required", http.StatusBadRequest)
		return
	}

	if err := h.Parser.SwitchProject(projectName); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
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

// GetCard handles GET /columns/{columnID}/cards/{cardID}
func (h *Handler) GetCard(w http.ResponseWriter, r *http.Request) {
	columnID := chi.URLParam(r, "columnID")
	cardID := chi.URLParam(r, "cardID")

	board, err := h.Parser.ParseBoard()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Find the column
	var targetColumn *models.Column
	for i := range board.Columns {
		if board.Columns[i].ID == columnID {
			targetColumn = &board.Columns[i]
			break
		}
	}

	if targetColumn == nil {
		http.Error(w, fmt.Sprintf("column %s not found", columnID), http.StatusNotFound)
		return
	}

	// Find the card
	var targetCard *models.Task
	for i := range targetColumn.Tasks {
		if targetColumn.Tasks[i].ID == cardID {
			targetCard = &targetColumn.Tasks[i]
			break
		}
	}

	if targetCard == nil {
		http.Error(w, fmt.Sprintf("card %s not found in column %s", cardID, columnID), http.StatusNotFound)
		return
	}

	// Convert comments to response format
	comments := make([]CommentResponse, len(targetCard.Comments))
	for i, comment := range targetCard.Comments {
		comments[i] = CommentResponse{
			ID:        comment.ID,
			Text:      comment.Text,
			CreatedAt: comment.CreatedAt,
		}
	}

	response := CardResponse{
		ID:          targetCard.ID,
		Title:       targetCard.Title,
		Description: targetCard.Description,
		Comments:    comments,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

// DeleteCard handles DELETE /columns/{columnID}/cards/{cardID}
func (h *Handler) DeleteCard(w http.ResponseWriter, r *http.Request) {
	columnID := chi.URLParam(r, "columnID")
	cardID := chi.URLParam(r, "cardID")

	if err := h.Parser.DeleteCard(columnID, cardID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GetColumn handles GET /columns/{columnID}
func (h *Handler) GetColumn(w http.ResponseWriter, r *http.Request) {
	columnID := chi.URLParam(r, "columnID")

	board, err := h.Parser.ParseBoard()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Find the column
	var targetColumn *models.Column
	for i := range board.Columns {
		if board.Columns[i].ID == columnID {
			targetColumn = &board.Columns[i]
			break
		}
	}

	if targetColumn == nil {
		http.Error(w, fmt.Sprintf("column %s not found", columnID), http.StatusNotFound)
		return
	}

	// Convert tasks to response format
	tasks := make([]CardResponse, len(targetColumn.Tasks))
	for i, task := range targetColumn.Tasks {
		// Convert comments to response format
		comments := make([]CommentResponse, len(task.Comments))
		for j, comment := range task.Comments {
			comments[j] = CommentResponse{
				ID:        comment.ID,
				Text:      comment.Text,
				CreatedAt: comment.CreatedAt,
			}
		}

		tasks[i] = CardResponse{
			ID:          task.ID,
			Title:       task.Title,
			Description: task.Description,
			Comments:    comments,
		}
	}

	response := ColumnResponse{
		ID:    targetColumn.ID,
		Title: targetColumn.Title,
		Tasks: tasks,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

// DeleteColumn handles DELETE /columns/{columnID}
func (h *Handler) DeleteColumn(w http.ResponseWriter, r *http.Request) {
	columnID := chi.URLParam(r, "columnID")

	if err := h.Parser.DeleteColumn(columnID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// CreateColumn handles POST /columns
func (h *Handler) CreateColumn(w http.ResponseWriter, r *http.Request) {
	var req CreateColumnRequest
	if err := parseJSONBody(r, &req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.Parser.CreateColumn(req.Title); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

// GetBoard handles GET /board
func (h *Handler) GetBoard(w http.ResponseWriter, r *http.Request) {
	board, err := h.Parser.ParseBoard()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Convert columns and their tasks to response format
	columns := make([]ColumnResponse, len(board.Columns))
	for i, col := range board.Columns {
		tasks := make([]CardResponse, len(col.Tasks))
		for j, task := range col.Tasks {
			// Convert comments to response format
			comments := make([]CommentResponse, len(task.Comments))
			for k, comment := range task.Comments {
				comments[k] = CommentResponse{
					ID:        comment.ID,
					Text:      comment.Text,
					CreatedAt: comment.CreatedAt,
				}
			}

			tasks[j] = CardResponse{
				ID:          task.ID,
				Title:       task.Title,
				Description: task.Description,
				Comments:    comments,
			}
		}
		columns[i] = ColumnResponse{
			ID:    col.ID,
			Title: col.Title,
			Tasks: tasks,
		}
	}

	response := BoardResponse{
		Title:   board.Title,
		Columns: columns,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func parseJSONBody(r *http.Request, v interface{}) error {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		return fmt.Errorf("invalid JSON body: %w", err)
	}
	return nil
}
