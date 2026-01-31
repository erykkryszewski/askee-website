export function initAskeeHeader(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;
    const headerButton = safeRootElement.querySelector(".header .button[data-id]");

    if (!headerButton) {
        return;
    }

    function handleHeaderButtonClick(event) {
        const targetId = headerButton.dataset.id;

        sessionStorage.setItem("askee-chat-target", targetId);

        if (window.location.pathname.includes("/chat")) {
            event.preventDefault();
            const customEvent = new CustomEvent("askee:chat:external-switch", {
                detail: { targetId },
            });
            document.dispatchEvent(customEvent);
        }
    }

    headerButton.addEventListener("click", handleHeaderButtonClick);
}
