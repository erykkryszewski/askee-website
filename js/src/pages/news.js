function navigateToUrl(urlString) {
    if (typeof window.AskeeSpaNavigateToUrl === "function") {
        const urlObject = new URL(urlString, window.location.origin);
        window.AskeeSpaNavigateToUrl(urlObject.pathname + urlObject.search + urlObject.hash);
        return;
    }

    window.location.assign(urlString);
}

function initAskeeBlogFiltration(pageElement) {
    const filtrationFormElement = pageElement.querySelector("[data-askee-blog-filtration]");
    if (!filtrationFormElement) {
        return null;
    }

    const sortElement = filtrationFormElement.querySelector("[data-askee-blog-sort]");
    const categoryElement = filtrationFormElement.querySelector("[data-askee-blog-category]");
    const searchElement = filtrationFormElement.querySelector("[data-askee-blog-search]");

    let searchTimeoutId = 0;
    let lastNavigatedUrlString = "";

    function buildFiltrationUrlString() {
        const actionUrlString =
            filtrationFormElement.getAttribute("action") || window.location.pathname;
        const urlObject = new URL(actionUrlString, window.location.origin);

        if (sortElement && sortElement.value === "oldest") {
            urlObject.searchParams.set("askee_sort", "oldest");
        } else {
            urlObject.searchParams.delete("askee_sort");
        }

        if (categoryElement && categoryElement.value) {
            urlObject.searchParams.set("askee_category", categoryElement.value);
        } else {
            urlObject.searchParams.delete("askee_category");
        }

        const searchValueString = searchElement ? searchElement.value.trim() : "";
        if (searchValueString) {
            urlObject.searchParams.set("askee_search", searchValueString);
        } else {
            urlObject.searchParams.delete("askee_search");
        }

        return urlObject.toString();
    }

    function applyFiltration() {
        const targetUrlString = buildFiltrationUrlString();
        if (targetUrlString === lastNavigatedUrlString) {
            return;
        }
        lastNavigatedUrlString = targetUrlString;
        navigateToUrl(targetUrlString);
    }

    function onSelectChange() {
        if (searchTimeoutId) {
            window.clearTimeout(searchTimeoutId);
            searchTimeoutId = 0;
        }
        applyFiltration();
    }

    function onSearchInput() {
        if (searchTimeoutId) {
            window.clearTimeout(searchTimeoutId);
        }

        searchTimeoutId = window.setTimeout(() => {
            applyFiltration();
        }, 350);
    }

    function onSearchKeyDown(eventObject) {
        if (!eventObject || eventObject.key !== "Enter") {
            return;
        }
        eventObject.preventDefault();
        if (searchTimeoutId) {
            window.clearTimeout(searchTimeoutId);
            searchTimeoutId = 0;
        }
        applyFiltration();
    }

    if (sortElement) {
        sortElement.addEventListener("change", onSelectChange);
    }
    if (categoryElement) {
        categoryElement.addEventListener("change", onSelectChange);
    }
    if (searchElement) {
        searchElement.addEventListener("input", onSearchInput);
        searchElement.addEventListener("keydown", onSearchKeyDown);
    }

    filtrationFormElement.addEventListener("submit", (eventObject) => {
        eventObject.preventDefault();
        if (searchTimeoutId) {
            window.clearTimeout(searchTimeoutId);
            searchTimeoutId = 0;
        }
        applyFiltration();
    });

    return function cleanupAskeeBlogFiltration() {
        if (sortElement) {
            sortElement.removeEventListener("change", onSelectChange);
        }
        if (categoryElement) {
            categoryElement.removeEventListener("change", onSelectChange);
        }
        if (searchElement) {
            searchElement.removeEventListener("input", onSearchInput);
            searchElement.removeEventListener("keydown", onSearchKeyDown);
        }
        if (searchTimeoutId) {
            window.clearTimeout(searchTimeoutId);
            searchTimeoutId = 0;
        }
    };
}

function initAskeeFeaturedPostsLayout(pageElement) {
    const blogListsArray = Array.from(pageElement.querySelectorAll(".askee-blog__list--with-featured"));
    if (blogListsArray.length === 0) {
        return null;
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

    return function cleanupAskeeFeaturedPostsLayout() {
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
    };
}

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

    const cleanupFunctionsArray = [];

    const filtrationCleanupFunction = initAskeeBlogFiltration(pageElement);
    if (typeof filtrationCleanupFunction === "function") {
        cleanupFunctionsArray.push(filtrationCleanupFunction);
    }

    const featuredCleanupFunction = initAskeeFeaturedPostsLayout(pageElement);
    if (typeof featuredCleanupFunction === "function") {
        cleanupFunctionsArray.push(featuredCleanupFunction);
    }

    return function cleanupAskeeNewsPage() {
        for (let index = 0; index < cleanupFunctionsArray.length; index += 1) {
            try {
                cleanupFunctionsArray[index]();
            } catch (error) {}
        }

        delete pageElement.dataset.askeeInitialized;
    };
}
