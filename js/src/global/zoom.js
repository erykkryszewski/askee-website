function detectZoomLevel() {
    const zoomLevel = Math.round(window.devicePixelRatio * 100);

    document.body.classList.remove("zoomed-less", "zoomed-normal", "zoomed-more");

    if (zoomLevel < 100) {
        document.body.classList.add("zoomed-less");
    } else if (zoomLevel > 100) {
        document.body.classList.add("zoomed-more");
    } else {
        document.body.classList.add("zoomed-normal");
    }
}

export function initAskeeZoom() {
    detectZoomLevel();
    window.addEventListener("resize", detectZoomLevel);
}
