// Desktop board component
document.addEventListener('alpine:init', () => {
  Alpine.data('desktopBoard', () => ({
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
        onEnd: async function(evt) {
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
          onEnd: async function(evt) {
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
    }
  }));

  // Mobile board component
  Alpine.data('mobileBoard', () => ({
    currentColumn: 0,
    columnCount: document.querySelectorAll('.mobile-column').length,
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
      
      board.addEventListener('touchstart', (e) => {
        if (this.isDragging) return;
        this.touchStartX = e.touches[0].clientX;
        this.touchStartTime = Date.now();
      }, { passive: true });

      board.addEventListener('touchmove', (e) => {
        if (this.isDragging) return;
        this.touchEndX = e.touches[0].clientX;
      }, { passive: true });

      board.addEventListener('touchend', () => {
        if (this.isDragging) return;
        
        // Only process if we have both start and end coordinates
        if (!this.touchStartX || !this.touchEndX) return;
        
        const swipeDistance = this.touchStartX - this.touchEndX;
        const minSwipeDistance = 50; // Minimum distance for a swipe
        const touchDuration = Date.now() - this.touchStartTime;
        const maxSwipeTime = 300; // Maximum time for a swipe in milliseconds

        // Only process if it's a quick swipe motion
        if (touchDuration <= maxSwipeTime && Math.abs(swipeDistance) >= minSwipeDistance) {
          if (swipeDistance > 0 && this.currentColumn < this.columnCount - 1) {
            // Swipe left -> next column
            this.swipeDirection = 'left';
            this.currentColumn++;
          } else if (swipeDistance < 0 && this.currentColumn > 0) {
            // Swipe right -> previous column
            this.swipeDirection = 'right';
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
          onChoose: function(evt) {
            const touchY = evt.originalEvent?.touches?.[0]?.clientY;
            if (!touchY || Math.abs(touchY - evt.originalEvent.target.getBoundingClientRect().top) < 30) {
              evt.preventDefault(); // Prevent drag if touch is too close to edge
            }
          },
          onStart: function(evt) {
            const mobileBoard = Alpine.raw(evt.to.closest('[x-data="mobileBoard"]').__x.$data);
            mobileBoard.isDragging = true;
            evt.from.classList.add('dragging');
          },
          onMove: function(evt) {
            // Additional safety check during movement
            if (evt.related && !evt.related.classList.contains('mobile-card')) {
              return false; // Prevent dropping on non-card elements
            }
            return true;
          },
          onEnd: async function(evt) {
            const toColumn = evt.to.closest(".mobile-column");
            const toColumnId = toColumn.dataset.columnId;
            const mobileBoard = Alpine.raw(evt.to.closest('[x-data="mobileBoard"]').__x.$data);
            
            try {
              const taskIds = Array.from(toColumn.querySelectorAll(".mobile-card"))
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
    }
  }));
});

// Helper functions
// Card edit modal component
Alpine.data('cardEditModal', () => ({
  form: {
    title: '',
    description: '',
    columnId: '',
    cardId: ''
  },

  openEditModal(event, columnId, cardId, title, description) {
    this.form.columnId = columnId;
    this.form.cardId = cardId;
    this.form.title = title;
    this.form.description = description;
    document.getElementById('edit-modal').showModal();
  },

  closeModal() {
    document.getElementById('edit-modal').close();
  },

  async saveCard() {
    try {
      const response = await fetch(`/api/columns/${this.form.columnId}/cards/${this.form.cardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: this.form.title,
          description: this.form.description
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update card: ${response.statusText}`);
      }

      this.closeModal();
      window.location.reload();
    } catch (error) {
      showError(error.message);
    }
  }
}));

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
