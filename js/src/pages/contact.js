export function initAskeeContactPage(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;
    const pageElement = safeRootElement.querySelector('[data-askee-page="kontakt"]');
    if (!pageElement) {
        return;
    }
    if (pageElement.dataset.askeeInitialized === "1") {
        return;
    }
    pageElement.dataset.askeeInitialized = "1";
    console.log("welcome on kontakt");
}
