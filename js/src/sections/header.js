export function initAskeeHeader() {
    if (window.__askeeHeaderInitialized === true) {
        return;
    }
    window.__askeeHeaderInitialized = true;

    function onWindowClickCapture(event) {
        const anchorElement = event.target.closest("a");
        if (!anchorElement) {
            return;
        }

        const headerButton = document.querySelector(".header .button[data-id]");
        if (!headerButton || anchorElement !== headerButton) {
            return;
        }

        const targetId = headerButton.dataset.id;
        if (!targetId) {
            return;
        }

        sessionStorage.setItem("askee-chat-target", targetId);

        const isChatPage =
            document.querySelector('[data-askee-page="chat"]') !== null ||
            window.location.pathname.indexOf("/chat") !== -1;

        const hasTargetOnCurrentPage = document.getElementById(targetId) !== null;

        if (!isChatPage || !hasTargetOnCurrentPage) {
            return;
        }

        event.stopImmediatePropagation();
        event.preventDefault();

        const customEvent = new CustomEvent("askee:chat:external-switch", {
            detail: { targetId },
        });
        document.dispatchEvent(customEvent);
    }

    window.addEventListener("click", onWindowClickCapture, true);
}
