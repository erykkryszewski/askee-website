document.addEventListener("DOMContentLoaded", () => {
    const mainButtons = document.querySelectorAll(".button");

    mainButtons.forEach((button) => {
        const hasChildren = button.children.length > 0;

        if (!hasChildren) {
            const currentText = button.innerText.trim();
            if (!button.getAttribute("data-text")) {
                button.setAttribute("data-text", currentText);
            }
        }
    });
});
