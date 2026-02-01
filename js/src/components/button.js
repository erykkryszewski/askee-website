export function initAskeeButtonComponent(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;
    const buttonsArray = safeRootElement.querySelectorAll(".button");

    for (let index = 0; index < buttonsArray.length; index += 1) {
        const buttonElement = buttonsArray[index];

        if (buttonElement.children.length > 0) {
            continue;
        }

        const currentText = (buttonElement.textContent || "").trim();
        if (!buttonElement.getAttribute("data-text")) {
            buttonElement.setAttribute("data-text", currentText);
        }
    }

    return null;
}
