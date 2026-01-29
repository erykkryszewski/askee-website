document.addEventListener("DOMContentLoaded", () => {
    const askeeAnimatedCircles = document.querySelectorAll(".animated-number__circle");

    if (!askeeAnimatedCircles.length) return;

    const askeeHandleIntersection = (entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const dasharrayValue = target.getAttribute("data-dasharray");
                target.style.setProperty("--dasharray", dasharrayValue);
                target.classList.add("animated-number__circle--animated");
                observer.unobserve(target);
            }
        });
    };

    const askeeObserver = new IntersectionObserver(askeeHandleIntersection, {
        root: null,
        threshold: 0.1,
    });

    askeeAnimatedCircles.forEach((element) => askeeObserver.observe(element));
});
