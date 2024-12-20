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

    init() {
      this.$nextTick(() => {
        this.initializeMobileSort();
      });
    },

    nextColumn() {
      if (this.currentColumn < this.columnCount - 1) {
        this.currentColumn++;
      }
    },

    prevColumn() {
      if (this.currentColumn > 0) {
        this.currentColumn--;
      }
    },

    initializeMobileSort() {
      // Temporarily disabled Sortable on mobile to debug layout issues
      console.log('Mobile sorting disabled for debugging');
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
