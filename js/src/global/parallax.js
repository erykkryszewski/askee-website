export function initAskeeParallax() {
    const blobTop = document.querySelector(".askee-blob--top-right");
    const blobBottom = document.querySelector(".askee-blob--bottom-left");

    if (!blobTop || !blobBottom) {
        return;
    }

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId = null;

    function onMouseMove(e) {
        targetX = e.clientX / window.innerWidth - 0.5;
        targetY = e.clientY / window.innerHeight - 0.5;
    }

    function tick() {
        currentX += (targetX - currentX) * 0.1;
        currentY += (targetY - currentY) * 0.1;

        const moveX = currentX * 50;
        const moveY = currentY * 50;

        blobTop.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;

        blobBottom.style.transform = `translate3d(${-moveX}px, ${-moveY}px, 0)`;

        rafId = requestAnimationFrame(tick);
    }

    // start
    window.addEventListener("mousemove", onMouseMove);
    tick();

    // cleanup (przy przeładowaniu strony)
    return function cleanup() {
        window.removeEventListener("mousemove", onMouseMove);
        if (rafId) cancelAnimationFrame(rafId);
    };
}
