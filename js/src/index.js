import { registerAskeeBlock } from "./global/boot";
import { initAskeeSpaHooks } from "./global/spa";
import { initAskeeZoom } from "./global/zoom";

import { initAskeeHeader } from "./sections/header";

import { initAskeeHomePage } from "./pages/home";
import { initAskeeChatPage } from "./pages/chat";
import { initAskeeAboutUsPage } from "./pages/about-us";
import { initAskeeOurPhilosophyPage } from "./pages/our-philosophy";
import { initAskeeContactPage } from "./pages/contact";
import { initAskeeNewsPage } from "./pages/news";

import { initAskeeButtonComponent } from "./components/button";
import { initAskeePhoneNumberComponent } from "./components/phone-number";

initAskeeZoom();

registerAskeeBlock(initAskeeHeader);

registerAskeeBlock(initAskeeHomePage);
registerAskeeBlock(initAskeeChatPage);
registerAskeeBlock(initAskeeAboutUsPage);
registerAskeeBlock(initAskeeOurPhilosophyPage);
registerAskeeBlock(initAskeeContactPage);
registerAskeeBlock(initAskeeNewsPage);

registerAskeeBlock(initAskeeButtonComponent);
registerAskeeBlock(initAskeePhoneNumberComponent);

initAskeeSpaHooks();

(function () {
    "use strict";

    const askeeThemeConfigObject = window.AskeeThemeConfig || {};

    const contentSelectorString =
        typeof askeeThemeConfigObject.contentSelector === "string"
            ? askeeThemeConfigObject.contentSelector
            : "#askee-app-content";
    const loadingBodyClassName =
        typeof askeeThemeConfigObject.loadingBodyClass === "string"
            ? askeeThemeConfigObject.loadingBodyClass
            : "askee-is-loading";
    const ajaxHeaderNameString =
        typeof askeeThemeConfigObject.ajaxHeaderName === "string"
            ? askeeThemeConfigObject.ajaxHeaderName
            : "X-ASKEE-PJAX";
    const ajaxHeaderValueString =
        typeof askeeThemeConfigObject.ajaxHeaderValue === "string"
            ? askeeThemeConfigObject.ajaxHeaderValue
            : "1";

    function isSameOriginUrl(urlString) {
        try {
            const urlObject = new URL(urlString, window.location.href);
            return urlObject.origin === window.location.origin;
        } catch (error) {
            return false;
        }
    }

    function shouldHandleAnchorElement(anchorElement) {
        if (!anchorElement) {
            return false;
        }

        const hrefAttributeValue = anchorElement.getAttribute("href");
        if (!hrefAttributeValue) {
            return false;
        }

        if (anchorElement.getAttribute("target") === "_blank") {
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

        const currentUrlObject = new URL(window.location.href);

        const isOnlyHashChange =
            urlObject.origin === currentUrlObject.origin &&
            urlObject.pathname === currentUrlObject.pathname &&
            urlObject.search === currentUrlObject.search &&
            urlObject.hash !== "" &&
            urlObject.hash !== currentUrlObject.hash;

        if (isOnlyHashChange) {
            return false;
        }

        return true;
    }

    function extractContentHtmlFromFetchedDocument(fetchedDocumentObject) {
        const fetchedContentElement = fetchedDocumentObject.querySelector(contentSelectorString);
        if (!fetchedContentElement) {
            return null;
        }
        return fetchedContentElement.innerHTML;
    }

    function updateDocumentTitleFromFetchedDocument(fetchedDocumentObject) {
        const fetchedTitleElement = fetchedDocumentObject.querySelector("title");
        if (fetchedTitleElement && typeof fetchedTitleElement.textContent === "string") {
            document.title = fetchedTitleElement.textContent;
        }
    }

    function updateBodyClassFromFetchedDocument(fetchedDocumentObject) {
        if (!fetchedDocumentObject.body) {
            return;
        }
        const fetchedBodyClassString =
            typeof fetchedDocumentObject.body.className === "string"
                ? fetchedDocumentObject.body.className
                : "";
        document.body.className = fetchedBodyClassString;
    }

    function updateCanonicalLinkFromFetchedDocument(fetchedDocumentObject) {
        const fetchedCanonicalElement =
            fetchedDocumentObject.querySelector('link[rel="canonical"]');
        if (!fetchedCanonicalElement) {
            return;
        }
        const fetchedCanonicalHref = fetchedCanonicalElement.getAttribute("href");
        if (!fetchedCanonicalHref) {
            return;
        }
        let existingCanonicalElement = document.querySelector('link[rel="canonical"]');
        if (!existingCanonicalElement) {
            existingCanonicalElement = document.createElement("link");
            existingCanonicalElement.setAttribute("rel", "canonical");
            document.head.appendChild(existingCanonicalElement);
        }
        existingCanonicalElement.setAttribute("href", fetchedCanonicalHref);
    }

    function dispatchAskeeNavigationEvent(urlString) {
        const customEventObject = new CustomEvent("askee:navigation:complete", {
            detail: {
                url: urlString,
            },
        });
        window.dispatchEvent(customEventObject);
    }

    let isNavigationInProgress = false;

    async function navigateToUrl(urlString, shouldPushStateValue) {
        if (isNavigationInProgress) {
            return;
        }

        const mainContentElement = document.querySelector(contentSelectorString);
        if (!mainContentElement) {
            window.location.href = urlString;
            return;
        }

        isNavigationInProgress = true;
        document.body.classList.add(loadingBodyClassName);

        try {
            const fetchResponse = await fetch(urlString, {
                method: "GET",
                headers: {
                    [ajaxHeaderNameString]: ajaxHeaderValueString,
                },
                credentials: "same-origin",
            });

            if (!fetchResponse || !fetchResponse.ok) {
                window.location.href = urlString;
                return;
            }

            const responseHtmlString = await fetchResponse.text();

            const domParserObject = new DOMParser();
            const fetchedDocumentObject = domParserObject.parseFromString(
                responseHtmlString,
                "text/html"
            );

            const newInnerHtmlString = extractContentHtmlFromFetchedDocument(fetchedDocumentObject);
            if (newInnerHtmlString === null) {
                window.location.href = urlString;
                return;
            }

            mainContentElement.innerHTML = newInnerHtmlString;

            updateDocumentTitleFromFetchedDocument(fetchedDocumentObject);
            updateBodyClassFromFetchedDocument(fetchedDocumentObject);
            updateCanonicalLinkFromFetchedDocument(fetchedDocumentObject);

            if (shouldPushStateValue) {
                const normalizedUrlObject = new URL(urlString, window.location.href);
                window.history.pushState(
                    { askee: true, url: normalizedUrlObject.href },
                    "",
                    normalizedUrlObject.href
                );
            }

            dispatchAskeeNavigationEvent(urlString);
        } catch (error) {
            window.location.href = urlString;
            return;
        } finally {
            document.body.classList.remove(loadingBodyClassName);
            isNavigationInProgress = false;
        }
    }

    function onDocumentClick(eventObject) {
        if (!eventObject) {
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

        const targetElement = eventObject.target;
        if (!targetElement) {
            return;
        }

        const anchorElement = targetElement.closest("a");
        if (!shouldHandleAnchorElement(anchorElement)) {
            return;
        }

        eventObject.preventDefault();

        const hrefAttributeValue = anchorElement.getAttribute("href");
        if (!hrefAttributeValue) {
            return;
        }

        const destinationUrlObject = new URL(hrefAttributeValue, window.location.href);
        const destinationUrlString = destinationUrlObject.href;

        navigateToUrl(destinationUrlString, true);
    }

    function onPopState(eventObject) {
        const currentUrlString = window.location.href;
        navigateToUrl(currentUrlString, false);
    }

    function initAskeeRouting() {
        document.addEventListener("click", onDocumentClick, true);
        window.addEventListener("popstate", onPopState);
        window.history.replaceState(
            { askee: true, url: window.location.href },
            "",
            window.location.href
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAskeeRouting);
    } else {
        initAskeeRouting();
    }
})();
