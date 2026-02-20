import { gsap } from "gsap";

function normalizePathnameForComparison(pathnameString) {
    let safePathnameString = pathnameString;

    if (typeof safePathnameString !== "string") {
        safePathnameString = "/";
    }

    if (safePathnameString === "") {
        safePathnameString = "/";
    }

    if (!safePathnameString.startsWith("/")) {
        safePathnameString = "/" + safePathnameString;
    }

    if (safePathnameString.length > 1 && safePathnameString.endsWith("/")) {
        safePathnameString = safePathnameString.slice(0, -1);
    }

    return safePathnameString;
}

function getUrlPathnameForComparison(urlString) {
    try {
        const urlObject = new URL(urlString, window.location.origin);
        return normalizePathnameForComparison(urlObject.pathname);
    } catch (error) {
        return "/";
    }
}

function clearActiveButtonsInWrapper(navigationButtonsWrapperElement) {
    if (!navigationButtonsWrapperElement) {
        return;
    }

    const buttonsArray = navigationButtonsWrapperElement.querySelectorAll("a[href]");
    for (let index = 0; index < buttonsArray.length; index += 1) {
        const buttonElement = buttonsArray[index];
        buttonElement.classList.remove("button--active");
    }
}

function trySetActiveButtonByHref(navigationButtonsWrapperElement) {
    if (!navigationButtonsWrapperElement) {
        return false;
    }

    const currentPathnameString = getUrlPathnameForComparison(window.location.href);

    const buttonsArray = navigationButtonsWrapperElement.querySelectorAll("a[href]");
    if (!buttonsArray || buttonsArray.length === 0) {
        return false;
    }

    let matchedAnyButton = false;

    for (let index = 0; index < buttonsArray.length; index += 1) {
        const buttonElement = buttonsArray[index];
        const hrefAttributeValue = buttonElement.getAttribute("href");
        if (!hrefAttributeValue) {
            continue;
        }

        const buttonPathnameString = getUrlPathnameForComparison(hrefAttributeValue);

        if (buttonPathnameString === currentPathnameString) {
            buttonElement.classList.add("button--active");
            matchedAnyButton = true;
        }
    }

    return matchedAnyButton;
}

function trySetActiveButtonByPageSlug(navigationButtonsWrapperElement, chatRootElement) {
    if (!navigationButtonsWrapperElement) {
        return false;
    }

    if (!chatRootElement) {
        return false;
    }

    const pageContainer = chatRootElement.querySelector("[data-askee-page]");
    if (!pageContainer) {
        return false;
    }

    const pageSlug = pageContainer.dataset.askeePage;
    if (!pageSlug) {
        return false;
    }

    const buttonsArray = navigationButtonsWrapperElement.querySelectorAll("[data-id]");
    if (!buttonsArray || buttonsArray.length === 0) {
        return false;
    }

    let matchedAnyButton = false;

    for (let index = 0; index < buttonsArray.length; index += 1) {
        const buttonElement = buttonsArray[index];
        const buttonIdValue = buttonElement.dataset.id;
        if (!buttonIdValue) {
            continue;
        }

        if (buttonIdValue.indexOf(pageSlug) !== -1) {
            buttonElement.classList.add("button--active");
            matchedAnyButton = true;
        }
    }

    return matchedAnyButton;
}

function updateChatNavigationButtonsActiveState(chatRootElement) {
    if (!chatRootElement) {
        return;
    }

    const navigationWrappersArray = Array.from(
        chatRootElement.querySelectorAll(".askee-chat__buttons")
    );

    for (let index = 0; index < navigationWrappersArray.length; index += 1) {
        const navigationButtonsWrapperElement = navigationWrappersArray[index];

        clearActiveButtonsInWrapper(navigationButtonsWrapperElement);

        const matchedByHref = trySetActiveButtonByHref(navigationButtonsWrapperElement);
        if (matchedByHref) {
            continue;
        }

        trySetActiveButtonByPageSlug(navigationButtonsWrapperElement, chatRootElement);
    }
}

function initTitleRotator(boxElement) {
    const wrapperElement = boxElement.closest(".askee-chat__wrapper");
    if (!wrapperElement) return null;

    const rotatorElement = wrapperElement.querySelector(".askee-chat__title-rotator");
    if (!rotatorElement) return null;

    let trackElement = rotatorElement.querySelector(".askee-chat__title-track");
    let titlesArray = [];

    if (!trackElement) {
        titlesArray = Array.from(rotatorElement.querySelectorAll(".askee-chat__title"));
        if (titlesArray.length < 2) return null;

        trackElement = document.createElement("div");
        trackElement.className = "askee-chat__title-track";

        titlesArray.forEach(function (title) {
            title.classList.add("askee-chat__title--rotator-item");
            trackElement.appendChild(title);
        });
        rotatorElement.appendChild(trackElement);
    } else {
        titlesArray = Array.from(trackElement.querySelectorAll(".askee-chat__title"));
    }

    let timeline = null;
    let resizeObserver = null;
    let lastWidth = rotatorElement.offsetWidth;

    function buildRotator() {
        if (timeline) timeline.kill();
        gsap.set(trackElement, { clearProps: "all" });
        gsap.set(rotatorElement, { clearProps: "height" });
        titlesArray.forEach((t) => gsap.set(t, { clearProps: "height" }));

        let maxHeight = 0;
        titlesArray.forEach(function (title) {
            const h = title.offsetHeight;
            if (h > maxHeight) maxHeight = h;
        });

        if (maxHeight === 0) return;

        rotatorElement.style.height = maxHeight + "px";
        titlesArray.forEach((t) => (t.style.height = maxHeight + "px"));

        timeline = gsap.timeline({ repeat: -1 });

        for (let i = 1; i < titlesArray.length; i++) {
            timeline.to(trackElement, {
                y: -1 * i * maxHeight,
                duration: 0.6,
                ease: "power2.inOut",
                delay: 3,
            });
        }

        timeline.to(trackElement, {
            y: 0,
            duration: 0.4,
            ease: "power2.out",
            delay: 3,
        });
    }

    buildRotator();

    resizeObserver = new ResizeObserver(function () {
        if (Math.abs(rotatorElement.offsetWidth - lastWidth) > 0.5) {
            lastWidth = rotatorElement.offsetWidth;
            buildRotator();
        }
    });
    resizeObserver.observe(rotatorElement);

    return {
        kill: function () {
            if (timeline) timeline.kill();
            if (resizeObserver) resizeObserver.disconnect();
        },
    };
}

function initSingleChatBox(boxElement) {
    if (boxElement.dataset.askeeBoxInitialized === "1") {
        return null;
    }
    boxElement.dataset.askeeBoxInitialized = "1";

    const switchSectionsElement = boxElement.querySelector(".askee-chat__switch-sections");
    const rotatorInstance = initTitleRotator(boxElement);

    let contentElementsArray = [];
    if (switchSectionsElement) {
        contentElementsArray = Array.from(
            switchSectionsElement.querySelectorAll(".askee-chat__content")
        );
    }

    let activeContentElement = null;
    if (switchSectionsElement) {
        activeContentElement = switchSectionsElement.querySelector(".askee-chat__content--active");
    }

    let activeTimeline = null;
    let hasInitialAnimationRun = false;

    function getWelcomeElementFromActiveContent() {
        if (!activeContentElement) {
            return null;
        }

        const welcomeElement = activeContentElement.querySelector(".askee-chat__welcome");
        if (!welcomeElement) {
            return null;
        }

        return welcomeElement;
    }

    function resetActiveContentKeepOnlyWelcome() {
        const welcomeElement = getWelcomeElementFromActiveContent();
        if (!activeContentElement || !welcomeElement) {
            return null;
        }

        let topLevelElementToKeep = welcomeElement;
        while (
            topLevelElementToKeep.parentElement &&
            topLevelElementToKeep.parentElement !== activeContentElement
        ) {
            topLevelElementToKeep = topLevelElementToKeep.parentElement;
        }

        const childrenArray = Array.from(activeContentElement.children);
        for (let index = 0; index < childrenArray.length; index += 1) {
            const childElement = childrenArray[index];
            if (childElement !== topLevelElementToKeep) {
                childElement.remove();
            }
        }

        return welcomeElement;
    }

    function renderTypingDotsIntoWelcome(welcomeElement) {
        if (!welcomeElement) {
            return;
        }

        welcomeElement.replaceChildren();

        const bubbleElement = document.createElement("span");
        bubbleElement.className = "askee-chat__dots";
        bubbleElement.setAttribute("role", "status");
        bubbleElement.setAttribute("aria-live", "polite");
        bubbleElement.setAttribute("aria-label", "Askee pisze");

        const dotOneElement = document.createElement("span");
        dotOneElement.className = "askee-chat__dots-dot";

        const dotTwoElement = document.createElement("span");
        dotTwoElement.className = "askee-chat__dots-dot";

        const dotThreeElement = document.createElement("span");
        dotThreeElement.className = "askee-chat__dots-dot";

        bubbleElement.appendChild(dotOneElement);
        bubbleElement.appendChild(dotTwoElement);
        bubbleElement.appendChild(dotThreeElement);

        welcomeElement.appendChild(bubbleElement);
    }

    function renderTextIntoWelcome(welcomeElement, textString) {
        if (!welcomeElement) {
            return;
        }

        welcomeElement.replaceChildren();

        let safeTextString = "";
        if (typeof textString === "string") {
            safeTextString = textString;
        }

        const normalizedTextString = safeTextString.replace(/\r\n/g, "\n").trim();
        if (!normalizedTextString) {
            welcomeElement.textContent = "Empty response";
            return;
        }

        const paragraphsArray = normalizedTextString.split(/\n{2,}/g);

        for (let paragraphIndex = 0; paragraphIndex < paragraphsArray.length; paragraphIndex += 1) {
            const paragraphTextString = paragraphsArray[paragraphIndex].trim();
            if (!paragraphTextString) {
                continue;
            }

            const linesArray = paragraphTextString.split("\n");
            for (let lineIndex = 0; lineIndex < linesArray.length; lineIndex += 1) {
                welcomeElement.appendChild(document.createTextNode(linesArray[lineIndex]));

                if (lineIndex !== linesArray.length - 1) {
                    welcomeElement.appendChild(document.createElement("br"));
                }
            }

            if (paragraphIndex !== paragraphsArray.length - 1) {
                welcomeElement.appendChild(document.createElement("br"));
                welcomeElement.appendChild(document.createElement("br"));
            }
        }
    }

    function normalizeToSingleActiveElement() {
        if (!switchSectionsElement || contentElementsArray.length === 0) {
            return;
        }

        if (!activeContentElement) {
            const defaultElement = boxElement.querySelector("[id*='default']");
            if (defaultElement) {
                activeContentElement = defaultElement;
            } else {
                activeContentElement = contentElementsArray[0];
            }
        }

        for (let index = 0; index < contentElementsArray.length; index += 1) {
            const element = contentElementsArray[index];

            if (element === activeContentElement) {
                element.classList.add("askee-chat__content--active");
                element.style.display = "block";
                continue;
            }

            element.classList.remove("askee-chat__content--active");
            element.style.display = "none";
        }
    }

    function findTargetContentElement(targetId) {
        if (!targetId) {
            return null;
        }

        if (!window.CSS || typeof window.CSS.escape !== "function") {
            return null;
        }

        const targetElement = boxElement.querySelector("#" + CSS.escape(targetId));
        if (!targetElement) {
            return null;
        }
        if (!targetElement.classList.contains("askee-chat__content")) {
            return null;
        }
        return targetElement;
    }

    function killActiveTimeline() {
        if (!activeTimeline) {
            return;
        }
        try {
            activeTimeline.kill();
        } catch (error) {}
        activeTimeline = null;
    }

    function clearGsapProps(element) {
        if (!element) {
            return;
        }
        try {
            gsap.set(element, { clearProps: "opacity,transform" });
        } catch (error) {}
    }

    function animateInitialContentOnLoad() {
        if (hasInitialAnimationRun) {
            return;
        }

        if (!activeContentElement) {
            return;
        }

        hasInitialAnimationRun = true;

        let animationDelaySeconds = 0;

        try {
            const chatRootElementForDelay = boxElement.closest(".askee-chat");
            if (chatRootElementForDelay) {
                const allBoxesArray = Array.from(
                    chatRootElementForDelay.querySelectorAll(".askee-chat__box")
                );

                const currentIndex = allBoxesArray.indexOf(boxElement);

                if (currentIndex > 0) {
                    const baseDelaySeconds = 0.15;
                    animationDelaySeconds = currentIndex * baseDelaySeconds;
                }
            }

            gsap.set(activeContentElement, {
                opacity: 0,
                y: 10,
            });

            gsap.to(activeContentElement, {
                duration: 0.55,
                delay: animationDelaySeconds,
                opacity: 1,
                y: 0,
                onComplete: function () {
                    clearGsapProps(activeContentElement);
                },
            });
        } catch (error) {}
    }

    function transitionToTargetId(targetId) {
        const targetElement = findTargetContentElement(targetId);
        if (!targetElement) {
            return false;
        }

        if (targetElement === activeContentElement) {
            return true;
        }

        killActiveTimeline();
        normalizeToSingleActiveElement();

        const previousElement = activeContentElement;

        for (let index = 0; index < contentElementsArray.length; index += 1) {
            const element = contentElementsArray[index];
            if (element === previousElement || element === targetElement) {
                continue;
            }
            element.classList.remove("askee-chat__content--active");
            element.style.display = "none";
            clearGsapProps(element);
        }

        targetElement.style.display = "block";
        targetElement.classList.add("askee-chat__content--active");

        clearGsapProps(previousElement);
        clearGsapProps(targetElement);

        try {
            activeTimeline = gsap.timeline({
                onComplete: function () {
                    if (previousElement) {
                        previousElement.classList.remove("askee-chat__content--active");
                        previousElement.style.display = "none";
                        clearGsapProps(previousElement);
                    }
                    activeContentElement = targetElement;
                    activeTimeline = null;
                },
            });

            if (previousElement) {
                activeTimeline.to(previousElement, { duration: 0.2, opacity: 0, y: -10 }, 0);
            }

            gsap.set(targetElement, { opacity: 0, y: 10 });
            activeTimeline.to(targetElement, { duration: 0.3, opacity: 1, y: 0 }, 0);
        } catch (error) {
            activeContentElement = targetElement;
            activeTimeline = null;
        }

        return true;
    }

    function onChatRootClick(eventObject) {
        const clickedElement = eventObject.target;
        if (!clickedElement) {
            return;
        }

        if (!(clickedElement instanceof Element)) {
            return;
        }

        const navigationTargetElement = clickedElement.closest(".askee-chat__buttons [data-id]");
        if (!navigationTargetElement) {
            return;
        }

        const targetId = navigationTargetElement.dataset.id;
        if (!targetId) {
            return;
        }

        const targetContentElement = findTargetContentElement(targetId);
        if (!targetContentElement) {
            return;
        }

        eventObject.preventDefault();
        transitionToTargetId(targetId);
    }

    const chatConfig = window.AskeeChatConfig || {};

    let restUrl = "";
    if (typeof chatConfig.restUrl === "string") {
        restUrl = chatConfig.restUrl;
    }

    let nonce = "";
    if (typeof chatConfig.nonce === "string") {
        nonce = chatConfig.nonce;
    }

    const formElement = boxElement.querySelector(".askee-chat__form");
    const textareaElement = formElement ? formElement.querySelector(".askee-chat__textarea") : null;
    const submitButton = formElement ? formElement.querySelector('[type="submit"]') : null;

    let isSending = false;
    let abortController = null;

    async function sendToApi(inputTextString) {
        if (!restUrl) {
            return null;
        }

        abortController = new AbortController();

        const responseObject = await fetch(restUrl, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "X-WP-Nonce": nonce,
            },
            body: JSON.stringify({ input: inputTextString }),
            signal: abortController.signal,
        });

        const parsedResponseObject = await responseObject.json().catch(function () {
            return null;
        });
        return parsedResponseObject;
    }

    async function onFormSubmit(eventObject) {
        eventObject.preventDefault();

        if (!textareaElement) {
            return;
        }

        const rawTextValue = textareaElement.value || "";
        const textValue = rawTextValue.trim();
        if (!textValue) {
            return;
        }

        if (isSending) {
            return;
        }

        isSending = true;
        if (submitButton) {
            submitButton.disabled = true;
        }

        textareaElement.value = "";

        normalizeToSingleActiveElement();
        const welcomeElement = resetActiveContentKeepOnlyWelcome();
        renderTypingDotsIntoWelcome(welcomeElement);

        try {
            const apiResponseObject = await sendToApi(textValue);

            normalizeToSingleActiveElement();
            const welcomeElementAfterResponse = resetActiveContentKeepOnlyWelcome();

            if (apiResponseObject && apiResponseObject.ok) {
                let assistantTextString = "";

                if (
                    apiResponseObject.json &&
                    Array.isArray(apiResponseObject.json) &&
                    apiResponseObject.json[0] &&
                    apiResponseObject.json[0].output
                ) {
                    assistantTextString = apiResponseObject.json[0].output;
                } else if (typeof apiResponseObject.raw === "string") {
                    assistantTextString = apiResponseObject.raw;
                }

                renderTextIntoWelcome(welcomeElementAfterResponse, assistantTextString);
            } else {
                renderTextIntoWelcome(welcomeElementAfterResponse, "Upstream Error");
            }
        } catch (error) {
            if (error && error.name === "AbortError") {
                return;
            }

            normalizeToSingleActiveElement();
            const welcomeElementAfterError = resetActiveContentKeepOnlyWelcome();
            renderTextIntoWelcome(welcomeElementAfterError, "Network Error");
        } finally {
            isSending = false;
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.focus();
            }
            abortController = null;
        }
    }

    boxElement.addEventListener("click", onChatRootClick);

    if (formElement) {
        formElement.addEventListener("submit", onFormSubmit);
    }

    if (textareaElement && formElement) {
        textareaElement.addEventListener("keydown", function (eventObject) {
            if (!eventObject) {
                return;
            }

            if (eventObject.key === "Enter" && !eventObject.shiftKey) {
                eventObject.preventDefault();
                formElement.dispatchEvent(new Event("submit"));
            }
        });
    }

    normalizeToSingleActiveElement();
    animateInitialContentOnLoad();

    return function cleanupSingleBox() {
        if (rotatorInstance) {
            rotatorInstance.kill();
        }

        boxElement.removeEventListener("click", onChatRootClick);
        if (formElement) {
            formElement.removeEventListener("submit", onFormSubmit);
        }
        if (abortController) {
            try {
                abortController.abort();
            } catch (error) {}
            abortController = null;
        }
        killActiveTimeline();
        delete boxElement.dataset.askeeBoxInitialized;
    };
}

export function initAskeeChatSection(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;

    const chatRootElement = safeRootElement.querySelector(".askee-chat");
    if (!chatRootElement) {
        return null;
    }

    const boxesNodeList = chatRootElement.querySelectorAll(".askee-chat__box");
    const cleanupFunctionsArray = [];

    for (let index = 0; index < boxesNodeList.length; index += 1) {
        const boxElement = boxesNodeList[index];
        const cleanupFunction = initSingleChatBox(boxElement);
        if (typeof cleanupFunction === "function") {
            cleanupFunctionsArray.push(cleanupFunction);
        }
    }

    updateChatNavigationButtonsActiveState(chatRootElement);

    function onAskeeNavigationCompleteEvent() {
        updateChatNavigationButtonsActiveState(chatRootElement);
    }

    window.addEventListener("askee:navigation:complete", onAskeeNavigationCompleteEvent);

    function onExternalSwitch(eventObject) {
        if (!eventObject.detail || !eventObject.detail.targetId) {
            return;
        }
        const targetId = eventObject.detail.targetId;
        if (!window.CSS || typeof window.CSS.escape !== "function") {
            return;
        }

        const targetElement = chatRootElement.querySelector("#" + CSS.escape(targetId));
        if (!targetElement) {
            return;
        }

        const targetBoxElement = targetElement.closest(".askee-chat__box");
        if (!targetBoxElement) {
            return;
        }

        if (targetBoxElement.dataset.askeeBoxInitialized !== "1") {
            return;
        }
    }

    document.addEventListener("askee:chat:external-switch", onExternalSwitch);

    return function cleanupAskeeChatSection() {
        window.removeEventListener("askee:navigation:complete", onAskeeNavigationCompleteEvent);
        document.removeEventListener("askee:chat:external-switch", onExternalSwitch);

        for (let index = 0; index < cleanupFunctionsArray.length; index += 1) {
            const cleanupFunction = cleanupFunctionsArray[index];
            try {
                cleanupFunction();
            } catch (error) {}
        }
    };
}
