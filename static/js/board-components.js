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

    init() {
      this.$nextTick(() => {
        this.initializeMobileSort();
      });
    },

    nextColumn() {
      if (!this.isDragging && this.currentColumn < this.columnCount - 1) {
        this.currentColumn++;
      }
    },

    prevColumn() {
      if (!this.isDragging && this.currentColumn > 0) {
        this.currentColumn--;
      }
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
          touchStartThreshold: 5, // Pixels moved before drag starts
          delay: 150, // Delay before drag starts (helps distinguish from scrolling)
          delayOnTouchOnly: true, // Only apply delay for touch devices
          fallbackTolerance: 3, // Pixels of movement allowed before fallback
          touchStartThreshold: 3, // Pixels moved before drag starts
          // Prevent auto-scrolling issues
          scroll: false,
          // Ensure drag only works vertically
          direction: "vertical",
          onStart: function(evt) {
            // Disable column navigation while dragging
            const mobileBoard = Alpine.raw(evt.to.closest('[x-data="mobileBoard"]').__x.$data);
            mobileBoard.isDragging = true;
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
