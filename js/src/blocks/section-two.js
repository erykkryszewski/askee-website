export function initAskeeSectionTwoBlock(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;
    const sectionElement = safeRootElement.querySelector('[data-askee-block="section-two"]');

    if (!sectionElement) {
        return;
    }

    if (sectionElement.dataset.askeeBlockInitialized === "1") {
        return;
    }

    sectionElement.dataset.askeeBlockInitialized = "1";

    console.log("Askee section two init");
}
