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

function initSingleChatBox(boxElement) {
    if (boxElement.dataset.askeeBoxInitialized === "1") {
        return null;
    }
    boxElement.dataset.askeeBoxInitialized = "1";

    const switchSectionsElement = boxElement.querySelector(".askee-chat__switch-sections");
    const messagesListElement = boxElement.querySelector(".askee-chat__messages-list");

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

    let baseStorageKey = "askee_chat_state_v1";
    if (typeof chatConfig.storageKey === "string") {
        baseStorageKey = chatConfig.storageKey;
    }

    let restUrl = "";
    if (typeof chatConfig.restUrl === "string") {
        restUrl = chatConfig.restUrl;
    }

    let nonce = "";
    if (typeof chatConfig.nonce === "string") {
        nonce = chatConfig.nonce;
    }

    let instanceId = "default";
    const parentContainer = boxElement.closest("[data-post-id]");
    if (parentContainer && parentContainer.dataset.postId) {
        instanceId = parentContainer.dataset.postId;
    } else {
        const allBoxesArray = Array.from(document.querySelectorAll(".askee-chat__box"));
        const uniqueIndex = allBoxesArray.indexOf(boxElement);
        instanceId = "box_" + String(uniqueIndex);
    }

    const finalStorageKey = baseStorageKey + "_" + instanceId;

    function loadChatState() {
        try {
            const rawValue = sessionStorage.getItem(finalStorageKey);
            if (!rawValue) {
                return { messages: [] };
            }
            const parsedValue = JSON.parse(rawValue);
            if (!parsedValue || !Array.isArray(parsedValue.messages)) {
                return { messages: [] };
            }
            return parsedValue;
        } catch (error) {
            return { messages: [] };
        }
    }

    function saveChatState(stateObject) {
        try {
            const encodedValue = JSON.stringify(stateObject);
            sessionStorage.setItem(finalStorageKey, encodedValue);
        } catch (error) {}
    }

    const formElement = boxElement.querySelector(".askee-chat__form");
    const textareaElement = formElement ? formElement.querySelector(".askee-chat__textarea") : null;
    const submitButton = formElement ? formElement.querySelector('[type="submit"]') : null;

    let isSending = false;
    let abortController = null;

    function pushMessage(roleString, textString) {
        const currentStateObject = loadChatState();
        currentStateObject.messages.push({
            role: roleString,
            text: textString,
            ts: Date.now(),
        });
        saveChatState(currentStateObject);
        console.log(
            "[Askee Chat - " + String(instanceId) + "] History Updated:",
            currentStateObject.messages
        );
    }

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

        pushMessage("user", textValue);

        textareaElement.value = "";

        try {
            const apiResponseObject = await sendToApi(textValue);

            console.log(
                "[Askee Chat - " + String(instanceId) + "] Raw Response:",
                apiResponseObject
            );

            if (apiResponseObject && apiResponseObject.ok) {
                let assistantTextString = "Empty response";

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

                pushMessage("assistant", assistantTextString);
            } else {
                pushMessage("assistant", "Upstream Error");
            }
        } catch (error) {
            if (error && error.name === "AbortError") {
            } else {
                pushMessage("assistant", "Network Error");
            }
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
