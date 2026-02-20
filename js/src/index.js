import { registerAskeeBlock } from "./global/boot";
import { initAskeeSpaHooks } from "./global/spa";
import { initAskeeZoom } from "./global/zoom";
import { initAskeeParallax } from "./global/parallax";

import { initAskeeHeader } from "./sections/header";
import { initAskeeChatSection } from "./sections/chat";

import { initAskeeHomePage } from "./pages/home";
import { initAskeeAboutUsPage } from "./pages/about-us";
import { initAskeeOurPhilosophyPage } from "./pages/our-philosophy";
import { initAskeeContactPage } from "./pages/contact";
import { initAskeeNewsPage } from "./pages/news";

import { initAskeeButtonComponent } from "./components/button";

initAskeeHeader();
initAskeeZoom();
initAskeeParallax();

registerAskeeBlock(initAskeeHomePage);
registerAskeeBlock(initAskeeChatSection);

registerAskeeBlock(initAskeeAboutUsPage);
registerAskeeBlock(initAskeeOurPhilosophyPage);
registerAskeeBlock(initAskeeContactPage);
registerAskeeBlock(initAskeeNewsPage);

registerAskeeBlock(initAskeeButtonComponent);

initAskeeSpaHooks();

(function () {
    "use strict";

    if (window.__askeeRoutingInitialized === true) {
        return;
    }
    window.__askeeRoutingInitialized = true;

    const askeeThemeConfigObject = window.AskeeThemeConfig || {};

    let contentSelectorString = "#askee-app-content";
    if (typeof askeeThemeConfigObject.contentSelector === "string") {
        contentSelectorString = askeeThemeConfigObject.contentSelector;
    }

    let loadingBodyClassName = "askee-is-loading";
    if (typeof askeeThemeConfigObject.loadingBodyClass === "string") {
        loadingBodyClassName = askeeThemeConfigObject.loadingBodyClass;
    }

    let ajaxHeaderNameString = "X-ASKEE-PJAX";
    if (typeof askeeThemeConfigObject.ajaxHeaderName === "string") {
        ajaxHeaderNameString = askeeThemeConfigObject.ajaxHeaderName;
    }

    let ajaxHeaderValueString = "1";
    if (typeof askeeThemeConfigObject.ajaxHeaderValue === "string") {
        ajaxHeaderValueString = askeeThemeConfigObject.ajaxHeaderValue;
    }

    let navigationTimeoutMsNumber = 9000;
    const navigationTimeoutCandidateNumber = Number(askeeThemeConfigObject.navigationTimeoutMs);
    if (Number.isFinite(navigationTimeoutCandidateNumber) && navigationTimeoutCandidateNumber > 0) {
        navigationTimeoutMsNumber = navigationTimeoutCandidateNumber;
    }

    let prefetchTimeoutMsNumber = 3500;
    const prefetchTimeoutCandidateNumber = Number(askeeThemeConfigObject.prefetchTimeoutMs);
    if (Number.isFinite(prefetchTimeoutCandidateNumber) && prefetchTimeoutCandidateNumber > 0) {
        prefetchTimeoutMsNumber = prefetchTimeoutCandidateNumber;
    }

    let maxConcurrentPrefetchRequestsNumber = 2;
    const maxConcurrentPrefetchCandidateNumber = Number(
        askeeThemeConfigObject.maxConcurrentPrefetchRequests
    );
    if (
        Number.isFinite(maxConcurrentPrefetchCandidateNumber) &&
        maxConcurrentPrefetchCandidateNumber > 0
    ) {
        maxConcurrentPrefetchRequestsNumber = Math.max(
            1,
            Math.floor(maxConcurrentPrefetchCandidateNumber)
        );
    }

    let hardReloadFallbackEnabled = false;
    if (typeof askeeThemeConfigObject.hardReloadFallbackEnabled === "boolean") {
        hardReloadFallbackEnabled = askeeThemeConfigObject.hardReloadFallbackEnabled;
    }

    function markInitialPageAsLoaded() {
        if (!document.body) {
            return;
        }
        document.body.classList.add("askee-page-loaded");
        applyCurrentPageSlugBodyClassFromDom();
    }

    if (document.readyState === "complete") {
        markInitialPageAsLoaded();
    } else {
        window.addEventListener("load", markInitialPageAsLoaded);
    }

    const askeeSpaCacheMap = new Map();
    const askeeSpaCachePendingFetchMap = new Map();
    const askeeSpaCacheMaxEntriesNumber = 15;
    const askeeSpaCacheTtlMillisecondsNumber = 5 * 60 * 1000;
    const askeePrefetchQueueArray = [];
    let askeeActivePrefetchCountNumber = 0;

    let activeNavigationAbortController = null;
    let activeNavigationTokenNumber = 0;

    function isSameOriginUrl(urlString) {
        try {
            const urlObject = new URL(urlString, window.location.href);
            return urlObject.origin === window.location.origin;
        } catch (error) {
            return false;
        }
    }

    function isHashOnlyHref(hrefAttributeValue) {
        if (!hrefAttributeValue) {
            return false;
        }
        if (hrefAttributeValue === "#") {
            return true;
        }
        if (hrefAttributeValue.indexOf("#") === 0) {
            return true;
        }
        return false;
    }

    function shouldHandleAnchorElement(anchorElement) {
        if (!anchorElement) {
            return false;
        }

        if (anchorElement.hasAttribute("data-askee-spa-ignore")) {
            return false;
        }

        const hrefAttributeValue = anchorElement.getAttribute("href");
        if (!hrefAttributeValue) {
            return false;
        }

        if (isHashOnlyHref(hrefAttributeValue)) {
            return false;
        }

        const targetAttributeValue = anchorElement.getAttribute("target");
        if (
            typeof targetAttributeValue === "string" &&
            targetAttributeValue !== "" &&
            targetAttributeValue.toLowerCase() !== "_self"
        ) {
            return false;
        }

        if (anchorElement.getAttribute("download") !== null) {
            return false;
        }

        if (!isSameOriginUrl(hrefAttributeValue)) {
            return false;
        }

        const urlObject = new URL(hrefAttributeValue, window.location.href);

        if (urlObject.pathname.indexOf("/wp-admin") === 0) {
            return false;
        }

        if (urlObject.pathname.indexOf("/wp-login.php") === 0) {
            return false;
        }

        if (hrefAttributeValue.indexOf("mailto:") === 0) {
            return false;
        }

        if (hrefAttributeValue.indexOf("tel:") === 0) {
            return false;
        }

        return true;
    }

    function getNormalizedUrlWithoutHashString(urlString) {
        const urlObject = new URL(urlString, window.location.href);
        urlObject.hash = "";
        return urlObject.href;
    }

    function getCacheKeyFromUrlString(urlString) {
        const urlObject = new URL(urlString, window.location.href);
        const pathnameString = typeof urlObject.pathname === "string" ? urlObject.pathname : "/";
        const searchString = typeof urlObject.search === "string" ? urlObject.search : "";
        return pathnameString + searchString;
    }

    function setCacheEntry(cacheKeyString, cacheEntryObject) {
        if (askeeSpaCacheMap.has(cacheKeyString)) {
            askeeSpaCacheMap.delete(cacheKeyString);
        }

        askeeSpaCacheMap.set(cacheKeyString, cacheEntryObject);

        while (askeeSpaCacheMap.size > askeeSpaCacheMaxEntriesNumber) {
            const firstKeyIterator = askeeSpaCacheMap.keys().next();
            if (!firstKeyIterator || firstKeyIterator.done) {
                break;
            }
            askeeSpaCacheMap.delete(firstKeyIterator.value);
        }
    }

    function getCacheEntry(cacheKeyString) {
        const cacheEntryObject = askeeSpaCacheMap.get(cacheKeyString);
        if (!cacheEntryObject) {
            return null;
        }

        const createdAtNumber = cacheEntryObject.createdAtNumber;
        if (typeof createdAtNumber !== "number") {
            askeeSpaCacheMap.delete(cacheKeyString);
            return null;
        }

        if (Date.now() - createdAtNumber > askeeSpaCacheTtlMillisecondsNumber) {
            askeeSpaCacheMap.delete(cacheKeyString);
            return null;
        }

        askeeSpaCacheMap.delete(cacheKeyString);
        askeeSpaCacheMap.set(cacheKeyString, cacheEntryObject);

        return cacheEntryObject;
    }

    function extractPageDataFromFetchedDocument(fetchedDocumentObject) {
        const fetchedContentElement = fetchedDocumentObject.querySelector(contentSelectorString);
        if (!fetchedContentElement) {
            return null;
        }

        const contentHtmlString = fetchedContentElement.innerHTML;

        let documentTitleString = "";
        const fetchedTitleElement = fetchedDocumentObject.querySelector("title");
        if (fetchedTitleElement && typeof fetchedTitleElement.textContent === "string") {
            documentTitleString = fetchedTitleElement.textContent;
        }

        let bodyClassString = "";
        if (
            fetchedDocumentObject.body &&
            typeof fetchedDocumentObject.body.className === "string"
        ) {
            bodyClassString = fetchedDocumentObject.body.className;
        }

        let canonicalHrefString = "";
        const fetchedCanonicalElement =
            fetchedDocumentObject.querySelector('link[rel="canonical"]');
        if (fetchedCanonicalElement) {
            const candidateCanonicalHrefString = fetchedCanonicalElement.getAttribute("href");
            if (candidateCanonicalHrefString) {
                canonicalHrefString = candidateCanonicalHrefString;
            }
        }

        return {
            contentHtmlString,
            documentTitleString,
            bodyClassString,
            canonicalHrefString,
        };
    }

    function updateDocumentTitle(documentTitleString) {
        if (typeof documentTitleString !== "string") {
            return;
        }
        if (!documentTitleString) {
            return;
        }
        document.title = documentTitleString;
    }

    function updateBodyClass(bodyClassString) {
        if (!document.body) {
            return;
        }

        const currentClassesArray = Array.from(document.body.classList);
        const persistentClassesArray = ["askee-page-loaded", loadingBodyClassName];

        let safeBodyClassString = "";
        if (typeof bodyClassString === "string") {
            safeBodyClassString = bodyClassString;
        }

        document.body.className = safeBodyClassString;

        for (let index = 0; index < persistentClassesArray.length; index += 1) {
            const classNameString = persistentClassesArray[index];
            if (currentClassesArray.includes(classNameString)) {
                document.body.classList.add(classNameString);
            }
        }

        applyCurrentPageSlugBodyClassFromDom();
    }

    function updateCanonicalLink(canonicalHrefString) {
        if (typeof canonicalHrefString !== "string") {
            return;
        }
        if (!canonicalHrefString) {
            return;
        }

        let existingCanonicalElement = document.querySelector('link[rel="canonical"]');
        if (!existingCanonicalElement) {
            existingCanonicalElement = document.createElement("link");
            existingCanonicalElement.setAttribute("rel", "canonical");
            document.head.appendChild(existingCanonicalElement);
        }
        existingCanonicalElement.setAttribute("href", canonicalHrefString);
    }

    function getCurrentPageSlugFromDom() {
        try {
            const pageElement = document.querySelector("[data-askee-page]");
            if (!pageElement) {
                return "askee-page-home";
            }

            const rawValue = pageElement.getAttribute("data-askee-page") || "";
            let baseSlugString = rawValue.trim();

            if (!baseSlugString) {
                baseSlugString = "home";
            }

            let normalizedSlugString = "";
            for (let index = 0; index < baseSlugString.length; index += 1) {
                const charCodeNumber = baseSlugString.charCodeAt(index);
                const charString = baseSlugString.charAt(index);

                const isDigit = charCodeNumber >= 48 && charCodeNumber <= 57;
                const isUppercaseLetter = charCodeNumber >= 65 && charCodeNumber <= 90;
                const isLowercaseLetter = charCodeNumber >= 97 && charCodeNumber <= 122;

                if (isDigit || isUppercaseLetter || isLowercaseLetter || charString === "-") {
                    normalizedSlugString += charString.toLowerCase();
                } else if (charString === " " || charString === "_" || charString === "/") {
                    normalizedSlugString += "-";
                }
            }

            if (!normalizedSlugString) {
                normalizedSlugString = "home";
            }

            return "askee-page-" + normalizedSlugString;
        } catch (error) {
            return "askee-page-home";
        }
    }

    function applyCurrentPageSlugBodyClassFromDom() {
        if (!document.body) {
            return;
        }

        const targetClassNameString = getCurrentPageSlugFromDom();
        const currentClassListArray = Array.from(document.body.classList);

        for (let index = 0; index < currentClassListArray.length; index += 1) {
            const classNameString = currentClassListArray[index];
            if (
                classNameString.indexOf("askee-page-") === 0 &&
                classNameString !== targetClassNameString
            ) {
                document.body.classList.remove(classNameString);
            }
        }

        if (!document.body.classList.contains(targetClassNameString)) {
            document.body.classList.add(targetClassNameString);
        }

        const headerButton = document.querySelector(".button--header");
        if (headerButton) {
            if (targetClassNameString === "askee-page-home") {
                headerButton.classList.add("display-none");
            } else {
                headerButton.classList.remove("display-none");
            }
        }
    }

    function replaceMainContentHtml(mainContentElement, newInnerHtmlString) {
        if (!mainContentElement) {
            return;
        }
        if (typeof newInnerHtmlString !== "string") {
            return;
        }

        const wrapperElement = document.createElement("div");
        wrapperElement.innerHTML = newInnerHtmlString;

        const newChildNodesArray = Array.from(wrapperElement.childNodes);
        mainContentElement.replaceChildren(...newChildNodesArray);
    }

    function dispatchAskeeNavigationEvent(urlString) {
        const customEventObject = new CustomEvent("askee:navigation:complete", {
            detail: {
                url: urlString,
            },
        });
        window.dispatchEvent(customEventObject);
    }

    function dispatchAskeeNavigationBeforeEvent(urlString) {
        const customEventObject = new CustomEvent("askee:navigation:before", {
            detail: {
                url: urlString,
            },
        });
        window.dispatchEvent(customEventObject);
    }

    function scrollToUrlHashIfAny(urlString) {
        let urlObject = null;

        try {
            urlObject = new URL(urlString, window.location.href);
        } catch (error) {
            window.scrollTo(0, 0);
            return;
        }

        const hashString = typeof urlObject.hash === "string" ? urlObject.hash : "";
        if (!hashString || hashString === "#") {
            window.scrollTo(0, 0);
            return;
        }

        const rawIdString = hashString.replace(/^#/, "");
        if (!rawIdString) {
            window.scrollTo(0, 0);
            return;
        }

        const decodedIdString = decodeURIComponent(rawIdString);

        const targetByIdElement = document.getElementById(decodedIdString);
        if (targetByIdElement) {
            targetByIdElement.scrollIntoView({ block: "start" });
            return;
        }

        const escapedIdString =
            window.CSS && typeof window.CSS.escape === "function"
                ? window.CSS.escape(decodedIdString)
                : decodedIdString;
        const targetByNameElement = document.querySelector('[name="' + escapedIdString + '"]');
        if (targetByNameElement) {
            targetByNameElement.scrollIntoView({ block: "start" });
            return;
        }

        window.scrollTo(0, 0);
    }

    function performHardNavigationFallback(urlString) {
        if (!hardReloadFallbackEnabled) {
            return;
        }
        window.location.href = urlString;
    }

    function reportNavigationIssue(urlString, reasonString, errorObject) {
        const customEventObject = new CustomEvent("askee:navigation:error", {
            detail: {
                url: urlString,
                reason: reasonString,
            },
        });
        window.dispatchEvent(customEventObject);

        if (!window.console || typeof window.console.warn !== "function") {
            return;
        }

        if (errorObject) {
            window.console.warn("[Askee SPA]", reasonString, urlString, errorObject);
            return;
        }

        window.console.warn("[Askee SPA]", reasonString, urlString);
    }

    function createTimeoutLinkedAbortSignal(parentSignalObject, timeoutMillisecondsNumber) {
        const linkedAbortController = new AbortController();
        const cleanupFunctionsArray = [];
        let didTimeoutAbort = false;

        function abortLinkedSignal() {
            if (linkedAbortController.signal.aborted) {
                return;
            }

            try {
                linkedAbortController.abort();
            } catch (error) {}
        }

        if (parentSignalObject) {
            if (parentSignalObject.aborted) {
                abortLinkedSignal();
            } else {
                const onParentAbort = function () {
                    abortLinkedSignal();
                };

                parentSignalObject.addEventListener("abort", onParentAbort, { once: true });
                cleanupFunctionsArray.push(function () {
                    parentSignalObject.removeEventListener("abort", onParentAbort);
                });
            }
        }

        const safeTimeoutMillisecondsNumber = Number.isFinite(timeoutMillisecondsNumber)
            ? Math.max(0, timeoutMillisecondsNumber)
            : 0;

        if (safeTimeoutMillisecondsNumber > 0) {
            const timeoutIdNumber = window.setTimeout(function () {
                didTimeoutAbort = true;
                abortLinkedSignal();
            }, safeTimeoutMillisecondsNumber);

            cleanupFunctionsArray.push(function () {
                window.clearTimeout(timeoutIdNumber);
            });
        }

        return {
            signal: linkedAbortController.signal,
            cleanup: function () {
                for (let index = 0; index < cleanupFunctionsArray.length; index += 1) {
                    try {
                        cleanupFunctionsArray[index]();
                    } catch (error) {}
                }
            },
            didTimeoutAbort: function () {
                return didTimeoutAbort;
            },
        };
    }

    function processPrefetchQueue() {
        while (
            askeeActivePrefetchCountNumber < maxConcurrentPrefetchRequestsNumber &&
            askeePrefetchQueueArray.length > 0
        ) {
            const prefetchTaskFunction = askeePrefetchQueueArray.shift();
            if (typeof prefetchTaskFunction !== "function") {
                continue;
            }

            askeeActivePrefetchCountNumber += 1;

            Promise.resolve()
                .then(prefetchTaskFunction)
                .catch(function () {})
                .finally(function () {
                    askeeActivePrefetchCountNumber = Math.max(
                        0,
                        askeeActivePrefetchCountNumber - 1
                    );
                    processPrefetchQueue();
                });
        }
    }

    function schedulePrefetchTask(prefetchTaskFunction) {
        if (typeof prefetchTaskFunction !== "function") {
            return;
        }
        askeePrefetchQueueArray.push(prefetchTaskFunction);
        processPrefetchQueue();
    }

    function abortAllPrefetchRequests() {
        askeePrefetchQueueArray.length = 0;

        askeeSpaCachePendingFetchMap.forEach(function (pendingPrefetchObject) {
            if (!pendingPrefetchObject || !pendingPrefetchObject.abortController) {
                return;
            }

            try {
                pendingPrefetchObject.abortController.abort();
            } catch (error) {}
        });

        askeeSpaCachePendingFetchMap.clear();
    }

    async function fetchPageData(urlWithoutHashString, abortSignalObject, timeoutMillisecondsNumber) {
        const linkedAbortObject = createTimeoutLinkedAbortSignal(
            abortSignalObject,
            timeoutMillisecondsNumber
        );

        try {
            const fetchResponse = await fetch(urlWithoutHashString, {
                method: "GET",
                headers: {
                    [ajaxHeaderNameString]: ajaxHeaderValueString,
                },
                credentials: "same-origin",
                signal: linkedAbortObject.signal,
            });

            if (!fetchResponse || !fetchResponse.ok) {
                return null;
            }

            const responseHtmlString = await fetchResponse.text();

            const domParserObject = new DOMParser();
            const fetchedDocumentObject = domParserObject.parseFromString(
                responseHtmlString,
                "text/html"
            );

            const pageDataObject = extractPageDataFromFetchedDocument(fetchedDocumentObject);
            return pageDataObject;
        } catch (error) {
            if (error && error.name === "AbortError" && linkedAbortObject.didTimeoutAbort()) {
                const timeoutErrorObject = new Error("Request timed out");
                timeoutErrorObject.name = "AskeeTimeoutError";
                throw timeoutErrorObject;
            }

            throw error;
        } finally {
            linkedAbortObject.cleanup();
        }
    }

    function setPageDataInCache(cacheKeyString, pageDataObject) {
        if (!pageDataObject) {
            return;
        }

        setCacheEntry(cacheKeyString, {
            createdAtNumber: Date.now(),
            contentHtmlString: pageDataObject.contentHtmlString,
            documentTitleString: pageDataObject.documentTitleString,
            bodyClassString: pageDataObject.bodyClassString,
            canonicalHrefString: pageDataObject.canonicalHrefString,
        });
    }

    async function prefetchUrlIfPossible(urlString) {
        if (!urlString) {
            return;
        }

        let normalizedUrlWithoutHashString = "";
        let cacheKeyString = "";

        try {
            normalizedUrlWithoutHashString = getNormalizedUrlWithoutHashString(urlString);
            cacheKeyString = getCacheKeyFromUrlString(urlString);
        } catch (error) {
            return;
        }

        const existingCacheEntryObject = getCacheEntry(cacheKeyString);
        if (existingCacheEntryObject) {
            return;
        }

        if (askeeSpaCachePendingFetchMap.has(cacheKeyString)) {
            return;
        }

        const pendingPrefetchObject = {
            queued: true,
            abortController: null,
            promise: null,
        };

        pendingPrefetchObject.promise = new Promise(function (resolvePromiseFunction) {
            schedulePrefetchTask(async function () {
                if (!askeeSpaCachePendingFetchMap.has(cacheKeyString)) {
                    resolvePromiseFunction(null);
                    return;
                }

                const prefetchAbortController = new AbortController();
                pendingPrefetchObject.queued = false;
                pendingPrefetchObject.abortController = prefetchAbortController;
                askeeSpaCachePendingFetchMap.set(cacheKeyString, pendingPrefetchObject);

                let resolvedPageDataObject = null;

                try {
                    const pageDataObject = await fetchPageData(
                        normalizedUrlWithoutHashString,
                        prefetchAbortController.signal,
                        prefetchTimeoutMsNumber
                    );
                    if (!pageDataObject) {
                        return;
                    }

                    setPageDataInCache(cacheKeyString, pageDataObject);
                    resolvedPageDataObject = pageDataObject;
                } catch (error) {
                } finally {
                    askeeSpaCachePendingFetchMap.delete(cacheKeyString);
                    resolvePromiseFunction(resolvedPageDataObject);
                }
            });
        });

        askeeSpaCachePendingFetchMap.set(cacheKeyString, pendingPrefetchObject);
    }

    function applyPageDataToDom(
        mainContentElement,
        pageDataObject,
        urlString,
        shouldPushStateValue
    ) {
        if (!pageDataObject) {
            return false;
        }

        dispatchAskeeNavigationBeforeEvent(urlString);

        replaceMainContentHtml(mainContentElement, pageDataObject.contentHtmlString);

        updateDocumentTitle(pageDataObject.documentTitleString);

        if (shouldPushStateValue) {
            const normalizedUrlObject = new URL(urlString, window.location.href);
            window.history.pushState(
                { askee: true, url: normalizedUrlObject.href },
                "",
                normalizedUrlObject.href
            );
        }

        updateBodyClass(pageDataObject.bodyClassString);
        updateCanonicalLink(pageDataObject.canonicalHrefString);

        scrollToUrlHashIfAny(urlString);

        dispatchAskeeNavigationEvent(urlString);
        return true;
    }

    async function navigateToUrl(urlString, shouldPushStateValue) {
        const mainContentElement = document.querySelector(contentSelectorString);
        if (!mainContentElement) {
            reportNavigationIssue(urlString, "missing_content_container");
            performHardNavigationFallback(urlString);
            return;
        }

        let normalizedUrlWithoutHashString = "";
        let cacheKeyString = "";

        try {
            normalizedUrlWithoutHashString = getNormalizedUrlWithoutHashString(urlString);
            cacheKeyString = getCacheKeyFromUrlString(urlString);
        } catch (error) {
            reportNavigationIssue(urlString, "invalid_destination_url", error);
            performHardNavigationFallback(urlString);
            return;
        }

        const cachedPageDataObject = getCacheEntry(cacheKeyString);
        if (cachedPageDataObject) {
            const appliedFromCache = applyPageDataToDom(
                mainContentElement,
                cachedPageDataObject,
                urlString,
                shouldPushStateValue
            );
            if (appliedFromCache) {
                return;
            }
        }

        const pendingPrefetchObject = askeeSpaCachePendingFetchMap.get(cacheKeyString);
        if (pendingPrefetchObject && pendingPrefetchObject.promise) {
            try {
                await pendingPrefetchObject.promise;
            } catch (error) {}

            const cachedPageDataAfterPrefetchObject = getCacheEntry(cacheKeyString);
            if (cachedPageDataAfterPrefetchObject) {
                const appliedFromPrefetchCache = applyPageDataToDom(
                    mainContentElement,
                    cachedPageDataAfterPrefetchObject,
                    urlString,
                    shouldPushStateValue
                );
                if (appliedFromPrefetchCache) {
                    return;
                }
            }
        }

        activeNavigationTokenNumber += 1;
        const localNavigationTokenNumber = activeNavigationTokenNumber;

        if (activeNavigationAbortController) {
            try {
                activeNavigationAbortController.abort();
            } catch (error) {}
        }

        activeNavigationAbortController = new AbortController();
        abortAllPrefetchRequests();

        if (document.body) {
            document.body.classList.add(loadingBodyClassName);
        }

        try {
            const pageDataObject = await fetchPageData(
                normalizedUrlWithoutHashString,
                activeNavigationAbortController.signal,
                navigationTimeoutMsNumber
            );
            if (localNavigationTokenNumber !== activeNavigationTokenNumber) {
                return;
            }

            if (!pageDataObject) {
                reportNavigationIssue(urlString, "missing_page_data");
                performHardNavigationFallback(urlString);
                return;
            }

            setPageDataInCache(cacheKeyString, pageDataObject);

            const appliedFromFetch = applyPageDataToDom(
                mainContentElement,
                pageDataObject,
                urlString,
                shouldPushStateValue
            );
            if (!appliedFromFetch) {
                reportNavigationIssue(urlString, "dom_apply_failed");
                performHardNavigationFallback(urlString);
                return;
            }
        } catch (error) {
            if (error && error.name === "AbortError") {
                return;
            }

            if (error && error.name === "AskeeTimeoutError") {
                reportNavigationIssue(urlString, "request_timeout", error);
                return;
            }

            reportNavigationIssue(urlString, "request_failed", error);
            performHardNavigationFallback(urlString);
            return;
        } finally {
            if (localNavigationTokenNumber === activeNavigationTokenNumber && document.body) {
                document.body.classList.remove(loadingBodyClassName);
            }
        }
    }

    window.AskeeSpaNavigateToUrl = function (urlString) {
        return navigateToUrl(urlString, true);
    };

    function getAnchorElementFromEvent(eventObject) {
        if (!eventObject) {
            return null;
        }

        if (typeof eventObject.composedPath === "function") {
            const eventPathArray = eventObject.composedPath();
            for (let index = 0; index < eventPathArray.length; index += 1) {
                const pathItem = eventPathArray[index];
                if (!(pathItem instanceof Element)) {
                    continue;
                }

                const tagNameString = typeof pathItem.tagName === "string" ? pathItem.tagName : "";
                if (tagNameString.toLowerCase() === "a") {
                    return pathItem;
                }

                const closestAnchorElement = pathItem.closest("a[href]");
                if (closestAnchorElement) {
                    return closestAnchorElement;
                }
            }
        }

        const targetElement = eventObject.target;
        if (!(targetElement instanceof Element)) {
            return null;
        }

        return targetElement.closest("a[href]");
    }

    function onDocumentClick(eventObject) {
        if (!eventObject) {
            return;
        }

        if (typeof eventObject.button === "number" && eventObject.button !== 0) {
            return;
        }

        const isModifiedClick =
            eventObject.metaKey ||
            eventObject.ctrlKey ||
            eventObject.shiftKey ||
            eventObject.altKey;

        if (isModifiedClick) {
            return;
        }

        const anchorElement = getAnchorElementFromEvent(eventObject);
        if (!shouldHandleAnchorElement(anchorElement)) {
            return;
        }

        const hrefAttributeValue = anchorElement.getAttribute("href");
        if (!hrefAttributeValue) {
            return;
        }

        let destinationUrlObject = null;
        try {
            destinationUrlObject = new URL(hrefAttributeValue, window.location.href);
        } catch (error) {
            return;
        }

        const currentUrlObject = new URL(window.location.href);

        const destinationPathAndSearchString =
            destinationUrlObject.pathname + destinationUrlObject.search;
        const currentPathAndSearchString = currentUrlObject.pathname + currentUrlObject.search;

        if (destinationPathAndSearchString === currentPathAndSearchString) {
            const destinationHashString =
                typeof destinationUrlObject.hash === "string" ? destinationUrlObject.hash : "";
            const currentHashString =
                typeof currentUrlObject.hash === "string" ? currentUrlObject.hash : "";

            if (destinationHashString && destinationHashString !== currentHashString) {
                return;
            }

            eventObject.preventDefault();
            return;
        }

        const destinationUrlString = destinationUrlObject.href;

        eventObject.preventDefault();
        navigateToUrl(destinationUrlString, true);
    }

    function onPopState(eventObject) {
        const currentUrlString = window.location.href;
        navigateToUrl(currentUrlString, false);
    }

    function onDocumentMouseOver(eventObject) {
        if (!eventObject) {
            return;
        }

        const anchorElement = getAnchorElementFromEvent(eventObject);
        if (!shouldHandleAnchorElement(anchorElement)) {
            return;
        }

        const relatedElement = eventObject.relatedTarget;
        if (relatedElement instanceof Element && anchorElement.contains(relatedElement)) {
            return;
        }

        const hrefAttributeValue = anchorElement.getAttribute("href");
        if (!hrefAttributeValue) {
            return;
        }

        let destinationUrlObject = null;
        try {
            destinationUrlObject = new URL(hrefAttributeValue, window.location.href);
        } catch (error) {
            return;
        }

        const destinationUrlString = destinationUrlObject.href;

        const currentUrlObject = new URL(window.location.href);
        const destinationPathAndSearchString =
            destinationUrlObject.pathname + destinationUrlObject.search;
        const currentPathAndSearchString = currentUrlObject.pathname + currentUrlObject.search;

        if (destinationPathAndSearchString === currentPathAndSearchString) {
            return;
        }

        prefetchUrlIfPossible(destinationUrlString);
    }

    function initAskeeRouting() {
        if (window.__askeeRoutingListenersBound === true) {
            return;
        }
        window.__askeeRoutingListenersBound = true;

        window.addEventListener("click", onDocumentClick, true);
        document.addEventListener("mouseover", onDocumentMouseOver, {
            capture: true,
            passive: true,
        });
        window.addEventListener("popstate", onPopState);

        try {
            window.history.replaceState(
                { askee: true, url: window.location.href },
                "",
                window.location.href
            );
        } catch (error) {}

        applyCurrentPageSlugBodyClassFromDom();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAskeeRouting);
    } else {
        initAskeeRouting();
    }
})();
