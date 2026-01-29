function detectZoomLevel() {
    const zoomLevel = Math.round(window.devicePixelRatio * 100);

    // Remove existing zoom classes
    document.body.classList.remove("zoomed-less", "zoomed-normal", "zoomed-more");

    if (zoomLevel < 100) {
        document.body.classList.add("zoomed-less");
    } else if (zoomLevel > 100) {
        document.body.classList.add("zoomed-more");
    } else {
        document.body.classList.add("zoomed-normal");
    }
}

// Run the detection function on page load
window.onload = detectZoomLevel;

// Run the detection function when the window is resized (zoom change)
window.onresize = detectZoomLevel;
