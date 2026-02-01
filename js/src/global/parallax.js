let askeeParallaxIsInitialized = false;

export function initAskeeParallax() {
    const hasMatchMediaFunction = typeof window.matchMedia === "function";

    if (hasMatchMediaFunction) {
        const prefersReducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (prefersReducedMotionQuery && prefersReducedMotionQuery.matches) {
            return;
        }
    }

    if (askeeParallaxIsInitialized === true) {
        return;
    }
    askeeParallaxIsInitialized = true;

    const stateObject = {
        targetX: 0,
        targetY: 0,
        currentX: 0,
        currentY: 0,
        blobTopRightElement: null,
        blobBottomLeftElement: null,
        baseTransformTopRight: "",
        baseTransformBottomLeft: "",
        animationFrameId: 0,
        isMouseListenerAttached: false,
    };

    function onMouseMove(eventObject) {
        if (!eventObject) {
            return;
        }

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (viewportWidth <= 0 || viewportHeight <= 0) {
            return;
        }

        const normalizedX = eventObject.clientX / viewportWidth - 0.5;
        const normalizedY = eventObject.clientY / viewportHeight - 0.5;

        stateObject.targetX = normalizedX * 2;
        stateObject.targetY = normalizedY * 2;
    }

    function stopParallax() {
        if (stateObject.animationFrameId) {
            window.cancelAnimationFrame(stateObject.animationFrameId);
            stateObject.animationFrameId = 0;
        }

        if (stateObject.isMouseListenerAttached) {
            window.removeEventListener("mousemove", onMouseMove);
            stateObject.isMouseListenerAttached = false;
        }

        stateObject.blobTopRightElement = null;
        stateObject.blobBottomLeftElement = null;
        stateObject.baseTransformTopRight = "";
        stateObject.baseTransformBottomLeft = "";
    }

    function readBaseTransformsIfNeeded() {
        const blobTopRightElement = stateObject.blobTopRightElement;
        const blobBottomLeftElement = stateObject.blobBottomLeftElement;

        if (blobTopRightElement && stateObject.baseTransformTopRight === "") {
            const computedStyleTopRight = window.getComputedStyle(blobTopRightElement);
            const transformValueTopRight = computedStyleTopRight.transform;
            if (transformValueTopRight && transformValueTopRight !== "none") {
                stateObject.baseTransformTopRight = transformValueTopRight;
            } else {
                stateObject.baseTransformTopRight = "";
            }
        }

        if (blobBottomLeftElement && stateObject.baseTransformBottomLeft === "") {
            const computedStyleBottomLeft = window.getComputedStyle(blobBottomLeftElement);
            const transformValueBottomLeft = computedStyleBottomLeft.transform;
            if (transformValueBottomLeft && transformValueBottomLeft !== "none") {
                stateObject.baseTransformBottomLeft = transformValueBottomLeft;
            } else {
                stateObject.baseTransformBottomLeft = "";
            }
        }
    }

    function animate() {
        const blobTopRightElement = stateObject.blobTopRightElement;
        const blobBottomLeftElement = stateObject.blobBottomLeftElement;

        if (!blobTopRightElement || !blobBottomLeftElement) {
            stateObject.animationFrameId = 0;
            return;
        }

        stateObject.currentX =
            stateObject.currentX + (stateObject.targetX - stateObject.currentX) * 0.1;
        stateObject.currentY =
            stateObject.currentY + (stateObject.targetY - stateObject.currentY) * 0.1;

        const xMoveFirstBlob = stateObject.currentX * 30;
        const yMoveFirstBlob = stateObject.currentY * 20;

        const xMoveSecondBlob = stateObject.currentX * -40;
        const yMoveSecondBlob = stateObject.currentY * -30;

        readBaseTransformsIfNeeded();

        let transformTopRightValue = "";
        if (stateObject.baseTransformTopRight !== "") {
            transformTopRightValue =
                stateObject.baseTransformTopRight +
                " translate3d(" +
                xMoveFirstBlob +
                "px, " +
                yMoveFirstBlob +
                "px, 0)";
        } else {
            transformTopRightValue =
                "translate3d(" + xMoveFirstBlob + "px, " + yMoveFirstBlob + "px, 0)";
        }

        let transformBottomLeftValue = "";
        if (stateObject.baseTransformBottomLeft !== "") {
            transformBottomLeftValue =
                stateObject.baseTransformBottomLeft +
                " translate3d(" +
                xMoveSecondBlob +
                "px, " +
                yMoveSecondBlob +
                "px, 0)";
        } else {
            transformBottomLeftValue =
                "translate3d(" + xMoveSecondBlob + "px, " + yMoveSecondBlob + "px, 0)";
        }

        blobTopRightElement.style.transform = transformTopRightValue;
        blobBottomLeftElement.style.transform = transformBottomLeftValue;

        stateObject.animationFrameId = window.requestAnimationFrame(animate);
    }

    function ensureAnimationRunning() {
        if (!stateObject.blobTopRightElement || !stateObject.blobBottomLeftElement) {
            return;
        }

        if (!stateObject.animationFrameId) {
            stateObject.animationFrameId = window.requestAnimationFrame(animate);
        }
    }

    function updateBlobElements() {
        const blobTopRightElement = document.querySelector(".askee-blob--top-right");
        const blobBottomLeftElement = document.querySelector(".askee-blob--bottom-left");

        const bothExist = !!blobTopRightElement && !!blobBottomLeftElement;

        if (!bothExist) {
            stopParallax();
            return;
        }

        stateObject.blobTopRightElement = blobTopRightElement;
        stateObject.blobBottomLeftElement = blobBottomLeftElement;

        if (!stateObject.isMouseListenerAttached) {
            window.addEventListener("mousemove", onMouseMove, { passive: true });
            stateObject.isMouseListenerAttached = true;
        }

        ensureAnimationRunning();
    }

    function initHooks() {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", updateBlobElements);
        } else {
            updateBlobElements();
        }

        window.addEventListener("askee:navigation:complete", updateBlobElements);
    }

    initHooks();
}
