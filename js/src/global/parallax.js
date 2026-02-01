export function initAskeeParallax() {
    const blobTopRight = document.querySelector(".askee-blob--top-right");
    const blobBottomLeft = document.querySelector(".askee-blob--bottom-left");

    if (!blobTopRight || !blobBottomLeft) {
        return;
    }

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    window.addEventListener("mousemove", (event) => {
        targetX = (event.clientX / window.innerWidth - 0.5) * 2;
        targetY = (event.clientY / window.innerHeight - 0.5) * 2;
    });

    function animate() {
        currentX += (targetX - currentX) * 0.1;
        currentY += (targetY - currentY) * 0.1;

        const xMove1 = currentX * 30;
        const yMove1 = currentY * 20;

        const xMove2 = currentX * -40;
        const yMove2 = currentY * -30;

        blobTopRight.style.transform = `translate3d(${xMove1}px, ${yMove1}px, 0)`;
        blobBottomLeft.style.transform = `translate3d(${xMove2}px, ${yMove2}px, 0)`;

        requestAnimationFrame(animate);
    }

    animate();
}
