export function initAskeeParallax() {
    const blobTop = document.querySelector(".askee-blob--top-right");
    const blobBottom = document.querySelector(".askee-blob--bottom-left");

    if (!blobTop || !blobBottom) return;

    const mq = window.matchMedia("(min-width: 1200px)");

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId = null;
    let enabled = false;

    function onMouseMove(e) {
        targetX = e.clientX / window.innerWidth - 0.5;
        targetY = e.clientY / window.innerHeight - 0.5;
    }

    function applyTransform() {
        const moveX = currentX * 50;
        const moveY = currentY * 50;

        blobTop.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
        blobBottom.style.transform = `translate3d(${-moveX}px, ${-moveY}px, 0)`;
    }

    function tick() {
        if (!enabled) return;

        currentX += (targetX - currentX) * 0.1;
        currentY += (targetY - currentY) * 0.1;

        applyTransform();
        rafId = requestAnimationFrame(tick);
    }

    function enable() {
        if (enabled) return;

        enabled = true;
        targetX = 0;
        targetY = 0;
        currentX = 0;
        currentY = 0;

        window.addEventListener("mousemove", onMouseMove, { passive: true });
        applyTransform();
        tick();
    }

    function disable() {
        if (!enabled) return;

        enabled = false;
        window.removeEventListener("mousemove", onMouseMove);

        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;

        blobTop.style.transform = "translate3d(0, 0, 0)";
        blobBottom.style.transform = "translate3d(0, 0, 0)";
    }

    function handleChange(e) {
        if (e.matches) enable();
        else disable();
    }

    handleChange(mq);
    mq.addEventListener("change", handleChange);

    return function cleanup() {
        disable();
        mq.removeEventListener("change", handleChange);
    };
}
