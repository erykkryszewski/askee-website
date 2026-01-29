export function initAskeeSectionOneBlock(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;
    const sectionElement = safeRootElement.querySelector('[data-askee-block="section-one"]');

    if (!sectionElement) {
        return;
    }

    if (sectionElement.dataset.askeeBlockInitialized === "1") {
        return;
    }

    sectionElement.dataset.askeeBlockInitialized = "1";

    console.log("Askee section one init");
}
