export function initAskeeNewsPage(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;
    const pageElement = safeRootElement.querySelector(
        '[data-askee-page="blog"], [data-askee-page="category"]'
    );
    if (!pageElement) {
        return;
    }
    if (pageElement.dataset.askeeInitialized === "1") {
        return;
    }
    pageElement.dataset.askeeInitialized = "1";

    const blogListsArray = Array.from(pageElement.querySelectorAll(".askee-blog__list--with-featured"));
    if (blogListsArray.length === 0) {
        return;
    }

    let animationFrameId = 0;

    function resetFeaturedListHeights(blogListElement) {
        if (!blogListElement) {
            return;
        }

        const postsArray = Array.from(blogListElement.querySelectorAll(":scope > .askee-blog__post"));
        if (postsArray.length === 0) {
            return;
        }

        const featuredPostElement = postsArray[0];
        if (featuredPostElement) {
            featuredPostElement.style.minHeight = "";
            const featuredLinkElement = featuredPostElement.querySelector(".askee-blog__post-link");
            if (featuredLinkElement) {
                featuredLinkElement.style.minHeight = "";
            }
        }

        const regularPostsArray = postsArray.slice(1, 5);
        for (let index = 0; index < regularPostsArray.length; index += 1) {
            const postElement = regularPostsArray[index];
            postElement.style.minHeight = "";
            const postLinkElement = postElement.querySelector(".askee-blog__post-link");
            if (postLinkElement) {
                postLinkElement.style.minHeight = "";
            }
        }
    }

    function syncSingleFeaturedListHeights(blogListElement) {
        if (!blogListElement) {
            return;
        }

        resetFeaturedListHeights(blogListElement);

        if (window.innerWidth <= 991) {
            return;
        }

        const postsArray = Array.from(blogListElement.querySelectorAll(":scope > .askee-blog__post"));
        if (postsArray.length < 5) {
            return;
        }

        const featuredPostElement = postsArray[0];
        if (!featuredPostElement || !featuredPostElement.classList.contains("askee-blog__post--featured")) {
            return;
        }
        const featuredLinkElement = featuredPostElement.querySelector(".askee-blog__post-link");

        const regularPostsArray = postsArray.slice(1, 5);
        if (regularPostsArray.length < 4) {
            return;
        }

        let maxRegularHeightNumber = 0;
        for (let index = 0; index < regularPostsArray.length; index += 1) {
            const currentHeightNumber = regularPostsArray[index].offsetHeight;
            if (currentHeightNumber > maxRegularHeightNumber) {
                maxRegularHeightNumber = currentHeightNumber;
            }
        }

        const featuredContentHeightNumber = featuredLinkElement
            ? featuredLinkElement.scrollHeight
            : 0;
        const featuredHeightNumber = Math.max(
            featuredPostElement.offsetHeight,
            featuredContentHeightNumber
        );
        const targetHalfHeightNumber = Math.max(
            maxRegularHeightNumber,
            Math.ceil(featuredHeightNumber / 2)
        );

        const targetFeaturedHeightNumber = targetHalfHeightNumber * 2;

        featuredPostElement.style.minHeight = targetFeaturedHeightNumber + "px";
        if (featuredLinkElement) {
            featuredLinkElement.style.minHeight = targetFeaturedHeightNumber + "px";
        }

        for (let index = 0; index < regularPostsArray.length; index += 1) {
            const postElement = regularPostsArray[index];
            postElement.style.minHeight = targetHalfHeightNumber + "px";
            const postLinkElement = postElement.querySelector(".askee-blog__post-link");
            if (postLinkElement) {
                postLinkElement.style.minHeight = targetHalfHeightNumber + "px";
            }
        }
    }

    function syncAllFeaturedListsHeights() {
        if (animationFrameId) {
            window.cancelAnimationFrame(animationFrameId);
        }

        animationFrameId = window.requestAnimationFrame(function () {
            for (let index = 0; index < blogListsArray.length; index += 1) {
                syncSingleFeaturedListHeights(blogListsArray[index]);
            }
        });
    }

    syncAllFeaturedListsHeights();

    function onWindowResize() {
        syncAllFeaturedListsHeights();
    }

    window.addEventListener("resize", onWindowResize);

    const imagesArray = Array.from(pageElement.querySelectorAll(".askee-blog__post-image"));
    for (let index = 0; index < imagesArray.length; index += 1) {
        const imageElement = imagesArray[index];
        imageElement.addEventListener("load", syncAllFeaturedListsHeights);
    }

    return function cleanupAskeeNewsPage() {
        window.removeEventListener("resize", onWindowResize);

        if (animationFrameId) {
            window.cancelAnimationFrame(animationFrameId);
            animationFrameId = 0;
        }

        for (let index = 0; index < imagesArray.length; index += 1) {
            imagesArray[index].removeEventListener("load", syncAllFeaturedListsHeights);
        }

        for (let index = 0; index < blogListsArray.length; index += 1) {
            resetFeaturedListHeights(blogListsArray[index]);
        }

        delete pageElement.dataset.askeeInitialized;
    };
}
