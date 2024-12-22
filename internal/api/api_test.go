package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/1broseidon/bangbang/internal/parser"
	"github.com/go-chi/chi/v5"
)

func setupTestHandler() *Handler {
	// Create parser with temporary file
	p := parser.NewParser(".", true, false)
	return &Handler{Parser: p}
}

func TestUpdateBoardTitle(t *testing.T) {
	h := setupTestHandler()

	tests := []struct {
		name       string
		reqBody    UpdateBoardTitleRequest
		wantStatus int
	}{
		{
			name:       "valid title update",
			reqBody:    UpdateBoardTitleRequest{Title: "New Board Title"},
			wantStatus: http.StatusNoContent,
		},
		{
			name:       "empty title",
			reqBody:    UpdateBoardTitleRequest{Title: ""},
			wantStatus: http.StatusNoContent, // Still valid as empty title is allowed
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.reqBody)
			req := httptest.NewRequest(http.MethodPut, "/board/title", bytes.NewBuffer(body))
			w := httptest.NewRecorder()

			h.UpdateBoardTitle(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("UpdateBoardTitle() status = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}

func TestUpdateColumnsOrder(t *testing.T) {
	h := setupTestHandler()

	tests := []struct {
		name       string
		reqBody    ColumnOrderRequest
		wantStatus int
	}{
		{
			name: "valid column order",
			reqBody: ColumnOrderRequest{
				Columns: []string{"todo", "in-progress", "review", "done"},
			},
			wantStatus: http.StatusNoContent,
		},
		{
			name: "invalid column ID",
			reqBody: ColumnOrderRequest{
				Columns: []string{"invalid-id"},
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.reqBody)
			req := httptest.NewRequest(http.MethodPut, "/columns/order", bytes.NewBuffer(body))
			w := httptest.NewRecorder()

			h.UpdateColumnsOrder(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("UpdateColumnsOrder() status = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}

func TestCreateCard(t *testing.T) {
	h := setupTestHandler()

	tests := []struct {
		name       string
		columnID   string
		reqBody    CreateCardRequest
		wantStatus int
	}{
		{
			name:     "valid card creation",
			columnID: "todo",
			reqBody: CreateCardRequest{
				Title:       "New Task",
				Description: "Task description",
			},
			wantStatus: http.StatusCreated,
		},
		{
			name:     "invalid column ID",
			columnID: "invalid-column",
			reqBody: CreateCardRequest{
				Title:       "New Task",
				Description: "Task description",
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.reqBody)
			req := httptest.NewRequest(http.MethodPut, "/columns/{columnID}/cards", bytes.NewBuffer(body))
			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("columnID", tt.columnID)
			req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
			w := httptest.NewRecorder()

			h.CreateCard(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("CreateCard() status = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}

func TestUpdateCardDetails(t *testing.T) {
	h := setupTestHandler()

	tests := []struct {
		name       string
		columnID   string
		cardID     string
		reqBody    UpdateCardRequest
		wantStatus int
	}{
		{
			name:     "valid card update",
			columnID: "todo",
			cardID:   "task-1",
			reqBody: UpdateCardRequest{
				Title:       "Updated Task",
				Description: "Updated description",
			},
			wantStatus: http.StatusNoContent,
		},
		{
			name:     "invalid column ID",
			columnID: "invalid-column",
			cardID:   "task-1",
			reqBody: UpdateCardRequest{
				Title:       "Updated Task",
				Description: "Updated description",
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.reqBody)
			req := httptest.NewRequest(http.MethodPut, "/columns/{columnID}/cards/{cardID}", bytes.NewBuffer(body))
			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("columnID", tt.columnID)
			rctx.URLParams.Add("cardID", tt.cardID)
			req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
			w := httptest.NewRecorder()

			h.UpdateCardDetails(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("UpdateCardDetails() status = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}
