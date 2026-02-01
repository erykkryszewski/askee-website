function detectZoomLevel() {
    const zoomLevel = Math.round(window.devicePixelRatio * 100);

    document.body.classList.remove("zoomed-less", "zoomed-normal", "zoomed-more");

    if (zoomLevel < 100) {
        document.body.classList.add("zoomed-less");
        return;
    }

    if (zoomLevel > 100) {
        document.body.classList.add("zoomed-more");
        return;
    }

    document.body.classList.add("zoomed-normal");
}

export function initAskeeZoom() {
    if (window.__askeeZoomInitialized === true) {
        return;
    }
    window.__askeeZoomInitialized = true;

    let scheduledFrameId = 0;

    function scheduleDetectZoomLevel() {
        if (scheduledFrameId) {
            return;
        }

        scheduledFrameId = window.requestAnimationFrame(() => {
            scheduledFrameId = 0;
            detectZoomLevel();
        });
    }

    detectZoomLevel();

    window.addEventListener("resize", scheduleDetectZoomLevel, { passive: true });
    window.addEventListener("askee:navigation:complete", scheduleDetectZoomLevel);
}
