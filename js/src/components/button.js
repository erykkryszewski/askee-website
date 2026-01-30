export function initAskeeButtonComponent(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;

    const buttonsArray = safeRootElement.querySelectorAll(".button");

    for (let index = 0; index < buttonsArray.length; index += 1) {
        const buttonElement = buttonsArray[index];

        if (buttonElement.dataset.askeeButtonInitialized === "1") {
            continue;
        }

        buttonElement.dataset.askeeButtonInitialized = "1";

        const hasChildren = buttonElement.children.length > 0;
        if (hasChildren) {
            continue;
        }

        const currentText = buttonElement.innerText.trim();
        if (!buttonElement.getAttribute("data-text")) {
            buttonElement.setAttribute("data-text", currentText);
        }
    }
}
