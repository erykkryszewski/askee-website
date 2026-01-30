export function initAskeeChatPage(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;
    const pageElement = safeRootElement.querySelector('[data-askee-page="chat"]');
    if (!pageElement) {
        return;
    }
    if (pageElement.dataset.askeeInitialized === "1") {
        return;
    }
    pageElement.dataset.askeeInitialized = "1";
    console.log("welcome on chat");
}
