document.addEventListener("DOMContentLoaded", function () {
  // Helper function to show error messages
  function showError(message) {
    console.error(message);
    // You could add a UI toast/notification here
  }

  // Helper function to make API calls
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
      // Reload the page to ensure UI is in sync with backend
      window.location.reload();
    }
  }

  // Helper function to get task IDs from a column
  function getTaskIds(column) {
    return Array.from(column.querySelectorAll(".card"))
      .map((card) => card.dataset.cardId)
      .filter(Boolean);
  }

  // Initialize Sortable for each column's card list
  document.querySelectorAll(".card-list").forEach((cardList) => {
    Sortable.create(cardList, {
      group: "shared",
      animation: 150,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",

      // Improve drop zone handling
      swapThreshold: 0.5,
      invertSwap: true,
      direction: "vertical",
      emptyInsertThreshold: 5,

      onStart: function () {
        document.body.style.cursor = "grabbing";
        // Add a class to all card lists to highlight drop zones
        document.querySelectorAll(".card-list").forEach((list) => {
          list.classList.add("sortable-receiving");
        });
      },

      onEnd: async function (evt) {
        document.body.style.cursor = "default";
        // Remove the highlighting class
        document.querySelectorAll(".card-list").forEach((list) => {
          list.classList.remove("sortable-receiving");
        });

        const toColumn = evt.to.closest(".column");
        const toColumnId = toColumn.dataset.columnId;
        const movedTaskId = evt.item.dataset.cardId;

        try {
          const taskIds = getTaskIds(toColumn.querySelector('.card-list'));
          console.log("Sending card order update:", {
            columnId: toColumnId,
            taskIds: taskIds,
            movedTaskId: movedTaskId
          });

          // Update the task's status in the target column
          await updateOrder(`/api/columns/${toColumnId}/cards/order`, {
            cards: taskIds,
          });

          console.log("Task move successful:", {
            taskId: movedTaskId,
            toColumn: toColumnId,
            newOrder: taskIds
          });
        } catch (error) {
          showError("Failed to update task status: " + error.message);
          window.location.reload();
        }
      },
    });
  });

  // Make columns sortable
  Sortable.create(document.querySelector(".board"), {
    animation: 150,
    handle: ".column h2",
    draggable: ".column",
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "sortable-drag",

    onEnd: async function (evt) {
      try {
        // Get all column IDs in their new order
        const columns = Array.from(evt.to.children)
          .map((col) => col.dataset.columnId)
          .filter(Boolean);

        // Update the backend
        await updateOrder("/api/columns/order", { columns });

        // Log the successful move
        console.log("Column moved:", {
          column: evt.item.querySelector("h2").textContent,
          newOrder: columns,
        });
      } catch (error) {
        showError("Failed to update column order: " + error.message);
        window.location.reload();
      }
    },
  });

  console.log("Drag and drop initialized with persistence");
});
