document.addEventListener("alpine:init", () => {
  // Title editing component
  Alpine.data("titleEdit", () => ({
    editing: false,
    title: "",
    originalTitle: "",

    init() {
      this.title = this.$root.dataset.title;
      this.originalTitle = this.title;
    },

    async save() {
      try {
        const response = await fetch("/api/board/title", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: this.title }),
        });
        if (!response.ok) throw new Error("Failed to update title");
        this.originalTitle = this.title;
        this.editing = false;
      } catch (error) {
        console.error(error);
        this.title = this.originalTitle;
        this.editing = false;
      }
    },
  }));

  // Theme toggle component
  Alpine.data("themeToggle", () => ({
    isDark: false,

    init() {
      // Check for saved theme preference or system preference
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        this.isDark = savedTheme === "dark";
      } else {
        this.isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      }

      // Apply initial theme
      this.updateTheme();

      // Listen for system theme changes
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", (e) => {
          if (!localStorage.getItem("theme")) {
            this.isDark = e.matches;
            this.updateTheme();
          }
        });
    },

    toggleTheme() {
      this.isDark = !this.isDark;
      this.updateTheme();
      localStorage.setItem("theme", this.isDark ? "dark" : "light");
    },

    updateTheme() {
      document.documentElement.setAttribute(
        "data-theme",
        this.isDark ? "dark" : "light"
      );
    },
  }));

  // Project selector component
  Alpine.data("projectSelector", () => ({
    isMultiProject: false,
    projects: [],
    currentProject: "",

    init() {
      // Check if multi-project mode is enabled
      this.isMultiProject = document.body.dataset.multiProject === "true";
      if (this.isMultiProject) {
        this.fetchProjects();
      }
    },

    async fetchProjects() {
      try {
        const response = await fetch("/api/projects");
        if (!response.ok) throw new Error("Failed to fetch projects");
        const data = await response.json();
        this.projects = data.projects;
        if (this.projects.length > 0 && !this.currentProject) {
          this.currentProject = this.projects[0];
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      }
    },

    async switchProject() {
      if (!this.currentProject) return;
      try {
        const response = await fetch(`/api/projects/${this.currentProject}`, {
          method: "PUT",
        });
        if (!response.ok) throw new Error("Failed to switch project");
        window.location.reload();
      } catch (error) {
        console.error("Failed to switch project:", error);
      }
    },
  }));

  // Card edit modal component
  Alpine.data("cardEditModal", () => ({
    form: {
      title: "",
      description: "",
      columnId: "",
      cardId: "",
      newComment: "",
    },
    comments: [],
    loading: false,
    columnName: "",
    titleEditing: false,
    descriptionEditing: false,
    originalTitle: "",
    originalDescription: "",

    async updateBoard() {
      // Update both desktop and mobile cards
      const cards = document.querySelectorAll(
        `[data-card-id="${this.form.cardId}"]`
      );
      cards.forEach((card) => {
        const titleEl = card.querySelector("h3");
        const descEl = card.querySelector("div:nth-child(2)");
        if (titleEl) titleEl.textContent = this.form.title;
        if (descEl)
          descEl.innerHTML = marked.parse(this.form.description || "");
      });
    },

    async saveTitle() {
      if (this.form.title === this.originalTitle) {
        this.titleEditing = false;
        return;
      }
      try {
        await this.saveCard(false);
        this.originalTitle = this.form.title;
        await this.updateBoard();
      } catch (error) {
        this.form.title = this.originalTitle;
      }
      this.titleEditing = false;
    },

    async saveDescription() {
      if (this.form.description === this.originalDescription) {
        this.descriptionEditing = false;
        return;
      }
      try {
        await this.saveCard(false);
        this.originalDescription = this.form.description;
        await this.updateBoard();
      } catch (error) {
        this.form.description = this.originalDescription;
      }
      this.descriptionEditing = false;
    },

    async deleteCard() {
      if (!confirm("Are you sure you want to delete this card?")) {
        return;
      }

      try {
        await deleteCard(this.form.columnId, this.form.cardId);
        this.closeModal();
        window.location.reload();
      } catch (error) {
        showError(error.message);
      }
    },

    async deleteComment(commentId) {
      if (!confirm("Are you sure you want to delete this comment?")) {
        return;
      }

      try {
        await deleteComment(this.form.columnId, this.form.cardId, commentId);
        await this.loadComments();
      } catch (error) {
        showError(error.message);
      }
    },

    async addComment() {
      if (!this.form.newComment.trim()) return;

      try {
        await createComment(
          this.form.columnId,
          this.form.cardId,
          this.form.newComment
        );
        this.form.newComment = "";
        await this.loadComments();
      } catch (error) {
        showError(error.message);
      }
    },

    formatDate(dateString) {
      return new Date(dateString).toLocaleString();
    },

    async loadComments() {
      try {
        const card = await fetchCard(this.form.columnId, this.form.cardId);
        this.comments = card.comments || [];
      } catch (error) {
        showError(error.message);
      }
    },

    init() {
      window.addEventListener("open-edit-modal", async (event) => {
        const { columnId, cardId, title, description } = event.detail;
        this.form.columnId = columnId;
        this.form.cardId = cardId;
        this.form.title = title;
        this.originalTitle = title;
        this.form.description = description;
        this.originalDescription = description;
        this.form.newComment = "";
        this.titleEditing = false;
        this.descriptionEditing = false;

        const column = document.querySelector(
          `[data-column-id="${columnId}"] h2`
        );
        this.columnName = column ? column.textContent : "";

        await this.loadComments();
        document.getElementById("edit-modal").showModal();
      });
    },

    closeModal() {
      document.getElementById("edit-modal").close();
      this.comments = [];
      this.form.newComment = "";
    },

    async saveCard(closeAfter = true) {
      try {
        const response = await fetch(
          `/api/columns/${this.form.columnId}/cards/${this.form.cardId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: this.form.title,
              description: this.form.description,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to update card: ${response.statusText}`);
        }

        if (closeAfter) {
          this.closeModal();
          window.location.reload();
        }
      } catch (error) {
        showError(error.message);
        throw error;
      }
    },
  }));

  // Desktop board component
  Alpine.data("desktopBoard", () => ({
    init() {
      // Initialize Sortable for desktop view
      this.initializeSortable();
    },

    initializeSortable() {
      // Initialize column sorting
      Sortable.create(document.querySelector(".desktop-board"), {
        animation: 150,
        handle: ".column h2",
        draggable: ".column",
        ghostClass: "sortable-ghost",
        chosenClass: "sortable-chosen",
        dragClass: "sortable-drag",
        onEnd: async function (evt) {
          try {
            const columns = Array.from(evt.to.children)
              .map((col) => col.dataset.columnId)
              .filter(Boolean);
            await updateOrder("/api/columns/order", { columns });
          } catch (error) {
            showError("Failed to update column order: " + error.message);
            window.location.reload();
          }
        },
      });

      // Initialize card sorting for each column
      document.querySelectorAll(".desktop-card-list").forEach((cardList) => {
        Sortable.create(cardList, {
          group: "shared",
          animation: 150,
          ghostClass: "sortable-ghost",
          chosenClass: "sortable-chosen",
          dragClass: "sortable-drag",
          swapThreshold: 0.5,
          invertSwap: true,
          direction: "vertical",
          emptyInsertThreshold: 5,
          onEnd: async function (evt) {
            const toColumn = evt.to.closest(".column");
            const toColumnId = toColumn.dataset.columnId;
            try {
              const taskIds = Array.from(toColumn.querySelectorAll(".card"))
                .map((card) => card.dataset.cardId)
                .filter(Boolean);
              await updateOrder(`/api/columns/${toColumnId}/cards/order`, {
                cards: taskIds,
              });
            } catch (error) {
              showError("Failed to update task status: " + error.message);
              window.location.reload();
            }
          },
        });
      });
    },
  }));

  // Mobile board component
  Alpine.data("mobileBoard", () => ({
    currentColumn: 0,
    columnCount: document.querySelectorAll(".mobile-column").length,
    isDragging: false,
    touchStartX: 0,
    touchEndX: 0,
    touchStartTime: 0,
    swipeDirection: null,

    init() {
      this.$nextTick(() => {
        this.initializeMobileSort();
        this.initializeTouchEvents();
      });
    },

    initializeTouchEvents() {
      const board = this.$el;

      board.addEventListener(
        "touchstart",
        (e) => {
          if (this.isDragging) return;
          this.touchStartX = e.touches[0].clientX;
          this.touchStartTime = Date.now();
        },
        { passive: true }
      );

      board.addEventListener(
        "touchmove",
        (e) => {
          if (this.isDragging) return;
          this.touchEndX = e.touches[0].clientX;
        },
        { passive: true }
      );

      board.addEventListener("touchend", () => {
        if (this.isDragging) return;

        // Only process if we have both start and end coordinates
        if (!this.touchStartX || !this.touchEndX) return;

        const swipeDistance = this.touchStartX - this.touchEndX;
        const minSwipeDistance = 50; // Minimum distance for a swipe
        const touchDuration = Date.now() - this.touchStartTime;
        const maxSwipeTime = 300; // Maximum time for a swipe in milliseconds

        // Only process if it's a quick swipe motion
        if (
          touchDuration <= maxSwipeTime &&
          Math.abs(swipeDistance) >= minSwipeDistance
        ) {
          if (swipeDistance > 0 && this.currentColumn < this.columnCount - 1) {
            // Swipe left -> next column
            this.swipeDirection = "left";
            this.currentColumn++;
          } else if (swipeDistance < 0 && this.currentColumn > 0) {
            // Swipe right -> previous column
            this.swipeDirection = "right";
            this.currentColumn--;
          }
        }

        // Reset touch coordinates
        this.touchStartX = 0;
        this.touchEndX = 0;
      });
    },

    initializeMobileSort() {
      document.querySelectorAll(".mobile-card-list").forEach((cardList) => {
        Sortable.create(cardList, {
          group: "shared-mobile",
          animation: 150,
          ghostClass: "sortable-ghost",
          chosenClass: "sortable-chosen",
          dragClass: "sortable-drag",
          // Touch-specific options
          touchStartThreshold: 10, // Increased threshold for better distinction
          delay: 200, // Increased delay for better scroll vs drag detection
          delayOnTouchOnly: true,
          fallbackTolerance: 5, // Increased tolerance
          // Prevent auto-scrolling issues
          scroll: true, // Enable scrolling
          scrollSensitivity: 80, // Adjust scroll sensitivity
          scrollSpeed: 20, // Adjust scroll speed
          // Ensure drag only works vertically
          direction: "vertical",
          // Improved touch handling
          forceFallback: true, // Use fallback touch handling
          fallbackClass: "sortable-fallback",
          dragoverBubble: false, // Prevent dragover event bubbling
          // Safety checks
          onChoose: function (evt) {
            const touchY = evt.originalEvent?.touches?.[0]?.clientY;
            if (
              !touchY ||
              Math.abs(
                touchY - evt.originalEvent.target.getBoundingClientRect().top
              ) < 30
            ) {
              evt.preventDefault(); // Prevent drag if touch is too close to edge
            }
          },
          onStart: function (evt) {
            const mobileBoard = Alpine.raw(
              evt.to.closest('[x-data="mobileBoard"]').__x.$data
            );
            mobileBoard.isDragging = true;
            evt.from.classList.add("dragging");
          },
          onMove: function (evt) {
            // Additional safety check during movement
            if (evt.related && !evt.related.classList.contains("mobile-card")) {
              return false; // Prevent dropping on non-card elements
            }
            return true;
          },
          onEnd: async function (evt) {
            const toColumn = evt.to.closest(".mobile-column");
            const toColumnId = toColumn.dataset.columnId;
            const mobileBoard = Alpine.raw(
              evt.to.closest('[x-data="mobileBoard"]').__x.$data
            );

            try {
              const taskIds = Array.from(
                toColumn.querySelectorAll(".mobile-card")
              )
                .map((card) => card.dataset.cardId)
                .filter(Boolean);
              await updateOrder(`/api/columns/${toColumnId}/cards/order`, {
                cards: taskIds,
              });
            } catch (error) {
              showError("Failed to update task status: " + error.message);
              window.location.reload();
            } finally {
              // Re-enable column navigation after drag ends
              mobileBoard.isDragging = false;
            }
          },
        });
      });
    },
  }));

  // New task modal component
  Alpine.data("newTaskModal", () => ({
    form: {
      title: "",
      description: "",
      columnId: "",
    },

    init() {
      window.addEventListener("open-new-task-modal", (event) => {
        const { columnId } = event.detail;
        this.form.columnId = columnId;
        this.form.title = "";
        this.form.description = "";
        document.getElementById("new-task-modal").showModal();
      });
    },

    closeModal() {
      document.getElementById("new-task-modal").close();
    },

    async saveTask() {
      try {
        const response = await fetch(
          `/api/columns/${this.form.columnId}/cards`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: this.form.title,
              description: this.form.description,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to create task: ${response.statusText}`);
        }

        this.closeModal();
        window.location.reload();
      } catch (error) {
        showError(error.message);
      }
    },
  }));
});

// Helper functions

// API functions for board operations
async function fetchBoard() {
  const response = await fetch("/api/board");
  if (!response.ok) throw new Error("Failed to fetch board data");
  return response.json();
}

async function fetchColumn(columnId) {
  const response = await fetch(`/api/columns/${columnId}`);
  if (!response.ok) throw new Error("Failed to fetch column data");
  return response.json();
}

async function fetchCard(columnId, cardId) {
  const response = await fetch(`/api/columns/${columnId}/cards/${cardId}`);
  if (!response.ok) throw new Error("Failed to fetch card data");
  return response.json();
}

async function deleteColumn(columnId) {
  const response = await fetch(`/api/columns/${columnId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete column");
}

async function deleteCard(columnId, cardId) {
  const response = await fetch(`/api/columns/${columnId}/cards/${cardId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete card");
}

function showError(message) {
  console.error(message);
}

async function updateOrder(endpoint, data) {
  try {
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update order: ${response.statusText}`);
    }
  } catch (error) {
    showError(error.message);
    window.location.reload();
  }
}

// Comment API functions
async function createComment(columnId, cardId, text) {
  const response = await fetch(
    `/api/columns/${columnId}/cards/${cardId}/comments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    }
  );
  if (!response.ok) throw new Error("Failed to create comment");
}

async function deleteComment(columnId, cardId, commentId) {
  const response = await fetch(
    `/api/columns/${columnId}/cards/${cardId}/comments/${commentId}`,
    {
      method: "DELETE",
    }
  );
  if (!response.ok) throw new Error("Failed to delete comment");
}
