export function initAskeeHeader(rootElement) {
    const headerButton = document.querySelector(".header .button[data-id]");

    if (!headerButton) {
        return;
    }

    if (headerButton.dataset.askeeHeaderInitialized === "1") {
        return;
    }
    headerButton.dataset.askeeHeaderInitialized = "1";

    window.addEventListener(
        "click",
        (event) => {
            const target = event.target.closest("a");

            if (!target || target !== headerButton) {
                return;
            }

            const targetId = headerButton.dataset.id;

            sessionStorage.setItem("askee-chat-target", targetId);

            const isChatPage = window.location.pathname.includes("/chat");

            if (isChatPage) {
                event.stopImmediatePropagation();
                event.preventDefault();

                const customEvent = new CustomEvent("askee:chat:external-switch", {
                    detail: { targetId },
                });
                document.dispatchEvent(customEvent);
            }
        },
        true
    );
}
