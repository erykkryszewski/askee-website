import { gsap } from "gsap";
import * as markdownJs from "markdown-js";

const ASKEE_CHAT_TRANSFER_KEY = "__askeePendingChatTransfer";
const ASKEE_CHAT_TRANSFER_MAX_AGE_MS = 30000;

// ujednolica pathname zeby latwo porownywac adresy
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

// bierze pathname z url i normalizuje go do porownan
function getUrlPathnameForComparison(urlString) {
    try {
        const urlObject = new URL(urlString, window.location.origin);
        return normalizePathnameForComparison(urlObject.pathname);
    } catch (error) {
        return "/";
    }
}

// zamienia temat na prosty slug
function normalizeTopicSlug(topicString) {
    let safeTopicString = "";
    if (typeof topicString === "string") {
        safeTopicString = topicString.trim();
    }

    if (!safeTopicString) {
        return "";
    }

    let normalizedTopicString = "";

    for (let index = 0; index < safeTopicString.length; index += 1) {
        const character = safeTopicString.charAt(index);
        const code = safeTopicString.charCodeAt(index);

        const isDigit = code >= 48 && code <= 57;
        const isUppercaseLetter = code >= 65 && code <= 90;
        const isLowercaseLetter = code >= 97 && code <= 122;

        if (isDigit || isUppercaseLetter || isLowercaseLetter) {
            normalizedTopicString += character.toLowerCase();
            continue;
        }

        if (character === "-" || character === "_" || character === "/" || character === " ") {
            normalizedTopicString += "-";
        }
    }

    normalizedTopicString = normalizedTopicString.replace(/-+/g, "-");
    normalizedTopicString = normalizedTopicString.replace(/^-+/, "");
    normalizedTopicString = normalizedTopicString.replace(/-+$/, "");

    return normalizedTopicString;
}

// wyciaga slug tematu z linku
function getTopicSlugFromHref(urlString) {
    const pathnameString = getUrlPathnameForComparison(urlString);
    if (pathnameString === "/") {
        return "";
    }

    return normalizeTopicSlug(pathnameString.slice(1));
}

// pobiera temat z data-askee-topic albo z aktualnego adresu
function getTopicSlugFromChatRoot(chatRootElement) {
    if (chatRootElement) {
        const topicContainerElement = chatRootElement.querySelector("[data-askee-topic]");
        if (topicContainerElement) {
            const topicFromDataAttribute = normalizeTopicSlug(
                topicContainerElement.getAttribute("data-askee-topic")
            );
            if (topicFromDataAttribute) {
                return topicFromDataAttribute;
            }
        }
    }

    return getTopicSlugFromHref(window.location.href);
}

// bezpiecznie parsuje string JSON, jesli string nie wyglada jak json to zwraca null
function tryParseJsonString(jsonCandidateString) {
    if (typeof jsonCandidateString !== "string") {
        return null;
    }

    const trimmedJsonCandidateString = jsonCandidateString.trim();
    if (!trimmedJsonCandidateString) {
        return null;
    }

    const looksLikeObjectJson =
        trimmedJsonCandidateString.startsWith("{") && trimmedJsonCandidateString.endsWith("}");
    const looksLikeArrayJson =
        trimmedJsonCandidateString.startsWith("[") && trimmedJsonCandidateString.endsWith("]");

    if (!looksLikeObjectJson && !looksLikeArrayJson) {
        return null;
    }

    try {
        return JSON.parse(trimmedJsonCandidateString);
    } catch (error) {
        return null;
    }
}

// dekoduje encje html typu &lt;div&gt; do <div>
function decodeHtmlEntities(encodedString) {
    if (typeof encodedString !== "string" || !encodedString) {
        return "";
    }

    const textareaElement = document.createElement("textarea");
    textareaElement.innerHTML = encodedString;
    return textareaElement.value;
}

// szybki check czy string wyglada jak html
function looksLikeHtmlString(valueString) {
    if (typeof valueString !== "string") {
        return false;
    }

    return /<\/?[a-z][\s\S]*>/i.test(valueString);
}

function normalizeSuggestionsArray(suggestionsCandidateValue) {
    if (!Array.isArray(suggestionsCandidateValue)) {
        return [];
    }

    const normalizedSuggestionsArray = [];

    for (let index = 0; index < suggestionsCandidateValue.length; index += 1) {
        const suggestionValue = suggestionsCandidateValue[index];
        if (typeof suggestionValue !== "string") {
            continue;
        }

        const normalizedSuggestionValue = suggestionValue.trim();
        if (!normalizedSuggestionValue) {
            continue;
        }

        if (normalizedSuggestionsArray.includes(normalizedSuggestionValue)) {
            continue;
        }

        normalizedSuggestionsArray.push(normalizedSuggestionValue);

        if (normalizedSuggestionsArray.length >= 3) {
            break;
        }
    }

    return normalizedSuggestionsArray;
}

function getPrimaryAssistantResponseNode(apiResponseObject) {
    if (!apiResponseObject) {
        return null;
    }

    if (Array.isArray(apiResponseObject.json) && apiResponseObject.json[0]) {
        return apiResponseObject.json[0];
    }

    if (apiResponseObject.json && typeof apiResponseObject.json === "object") {
        return apiResponseObject.json;
    }

    const parsedRawObject = tryParseJsonString(apiResponseObject.raw);
    if (Array.isArray(parsedRawObject) && parsedRawObject[0]) {
        return parsedRawObject[0];
    }

    if (parsedRawObject && typeof parsedRawObject === "object") {
        return parsedRawObject;
    }

    return null;
}

function extractAssistantPayloadFromApiResponse(apiResponseObject) {
    const payloadObject = {
        textString: "",
        topicSlugString: "",
        renderAsHtml: false,
        suggestionsArray: [],
    };

    const responseNodeObject = getPrimaryAssistantResponseNode(apiResponseObject);

    let outputCandidateString = "";
    let topicCandidateString = "";
    let suggestionsCandidateArray = [];

    if (responseNodeObject && typeof responseNodeObject === "object") {
        if (typeof responseNodeObject.output === "string") {
            outputCandidateString = responseNodeObject.output;
        } else if (typeof responseNodeObject.Output === "string") {
            outputCandidateString = responseNodeObject.Output;
        }

        if (typeof responseNodeObject.topic === "string") {
            topicCandidateString = responseNodeObject.topic;
        } else if (typeof responseNodeObject.Topic === "string") {
            topicCandidateString = responseNodeObject.Topic;
        }

        if (Array.isArray(responseNodeObject.suggestions)) {
            suggestionsCandidateArray = normalizeSuggestionsArray(responseNodeObject.suggestions);
        } else if (Array.isArray(responseNodeObject.Suggestions)) {
            suggestionsCandidateArray = normalizeSuggestionsArray(responseNodeObject.Suggestions);
        }
    }

    // obsluga przypadku: output to string z kolejnym jsonem {"output":"...","topic":"..."}
    const nestedOutputObject = tryParseJsonString(outputCandidateString);
    if (nestedOutputObject && typeof nestedOutputObject === "object") {
        if (typeof nestedOutputObject.output === "string") {
            outputCandidateString = nestedOutputObject.output;
        } else if (typeof nestedOutputObject.Output === "string") {
            outputCandidateString = nestedOutputObject.Output;
        }

        if (!topicCandidateString && typeof nestedOutputObject.topic === "string") {
            topicCandidateString = nestedOutputObject.topic;
        } else if (!topicCandidateString && typeof nestedOutputObject.Topic === "string") {
            topicCandidateString = nestedOutputObject.Topic;
        }

        const nestedSuggestionsArray = normalizeSuggestionsArray(
            nestedOutputObject.suggestions || nestedOutputObject.Suggestions
        );
        if (nestedSuggestionsArray.length > 0) {
            suggestionsCandidateArray = nestedSuggestionsArray;
        }
    }

    if (!outputCandidateString && apiResponseObject && typeof apiResponseObject.raw === "string") {
        outputCandidateString = apiResponseObject.raw;
    }

    if (suggestionsCandidateArray.length === 0 && apiResponseObject) {
        suggestionsCandidateArray = normalizeSuggestionsArray(
            apiResponseObject.suggestions || apiResponseObject.Suggestions
        );
    }

    const normalizedOutputString = outputCandidateString.replace(/\r\n/g, "\n").trim();
    const decodedOutputString = decodeHtmlEntities(normalizedOutputString);
    const shouldRenderAsHtml = looksLikeHtmlString(decodedOutputString);

    payloadObject.textString = shouldRenderAsHtml ? decodedOutputString : normalizedOutputString;
    payloadObject.topicSlugString = normalizeTopicSlug(topicCandidateString);
    payloadObject.renderAsHtml = shouldRenderAsHtml;
    payloadObject.suggestionsArray = suggestionsCandidateArray;

    return payloadObject;
}

// szuka tematu w zagniezdzonych danych odpowiedzi
function extractTopicFromNode(nodeValue, depthNumber) {
    if (depthNumber > 5 || !nodeValue) {
        return "";
    }

    if (Array.isArray(nodeValue)) {
        for (let index = 0; index < nodeValue.length; index += 1) {
            const topicFromArrayElement = extractTopicFromNode(nodeValue[index], depthNumber + 1);
            if (topicFromArrayElement) {
                return topicFromArrayElement;
            }
        }
        return "";
    }

    if (typeof nodeValue === "string") {
        const parsedNodeValue = tryParseJsonString(nodeValue);
        if (parsedNodeValue) {
            return extractTopicFromNode(parsedNodeValue, depthNumber + 1);
        }
        return "";
    }

    if (typeof nodeValue !== "object") {
        return "";
    }

    const topicKeysArray = ["topic", "Topic"];
    for (let index = 0; index < topicKeysArray.length; index += 1) {
        const keyString = topicKeysArray[index];
        const candidateValue = nodeValue[keyString];
        const normalizedTopicValue = normalizeTopicSlug(candidateValue);
        if (normalizedTopicValue) {
            return normalizedTopicValue;
        }
    }

    const nestedValuesArray = Object.values(nodeValue);
    for (let index = 0; index < nestedValuesArray.length; index += 1) {
        const topicFromNestedNode = extractTopicFromNode(nestedValuesArray[index], depthNumber + 1);
        if (topicFromNestedNode) {
            return topicFromNestedNode;
        }
    }

    return "";
}

// probuje odczytac temat z odpowiedzi api
function extractAssistantTopicFromApiResponse(apiResponseObject) {
    if (!apiResponseObject) {
        return "";
    }

    const topicFromJson = extractTopicFromNode(apiResponseObject.json, 0);
    if (topicFromJson) {
        return topicFromJson;
    }

    if (typeof apiResponseObject.raw === "string") {
        const trimmedRawString = apiResponseObject.raw.trim();

        if (
            trimmedRawString &&
            (trimmedRawString.startsWith("{") || trimmedRawString.startsWith("["))
        ) {
            try {
                const parsedRawObject = JSON.parse(trimmedRawString);
                return extractTopicFromNode(parsedRawObject, 0);
            } catch (error) {}
        }
    }

    return "";
}

// znajduje przycisk nawigacji pasujacy do tematu
function findNavigationButtonByTopic(chatRootElement, topicSlugString) {
    if (!chatRootElement || !topicSlugString) {
        return null;
    }

    const buttonElementsArray = chatRootElement.querySelectorAll(".askee-chat__buttons a[href]");

    for (let index = 0; index < buttonElementsArray.length; index += 1) {
        const buttonElement = buttonElementsArray[index];
        const hrefValueString = buttonElement.getAttribute("href");
        const buttonTopicSlug = getTopicSlugFromHref(hrefValueString);

        if (buttonTopicSlug === topicSlugString) {
            return buttonElement;
        }
    }

    return null;
}

// odczytuje tymczasowy transfer chatu miedzy podstronami
function readPendingChatTransfer() {
    const pendingTransferValue = window[ASKEE_CHAT_TRANSFER_KEY];
    if (!pendingTransferValue || typeof pendingTransferValue !== "object") {
        return null;
    }

    return pendingTransferValue;
}

// czyści dane tymczasowego transferu chatu
function clearPendingChatTransfer() {
    try {
        delete window[ASKEE_CHAT_TRANSFER_KEY];
    } catch (error) {
        window[ASKEE_CHAT_TRANSFER_KEY] = null;
    }
}

// zapisuje html chatu do przeniesienia na inna strone
function savePendingChatTransfer(topicSlugString, boxElement) {
    if (!topicSlugString || !boxElement) {
        return;
    }

    window[ASKEE_CHAT_TRANSFER_KEY] = {
        topicSlug: topicSlugString,
        boxInnerHtmlString: boxElement.innerHTML,
        createdAtTimestampNumber: Date.now(),
    };
}

// przywraca chat po przejsciu na strone z tym samym tematem
function tryApplyPendingChatTransfer(boxElement, chatRootElement) {
    if (!boxElement) {
        return false;
    }

    const pendingTransferObject = readPendingChatTransfer();
    if (!pendingTransferObject) {
        return false;
    }

    const createdAtTimestampNumber = Number(pendingTransferObject.createdAtTimestampNumber) || 0;
    const ageMillisecondsNumber = Date.now() - createdAtTimestampNumber;
    if (ageMillisecondsNumber > ASKEE_CHAT_TRANSFER_MAX_AGE_MS) {
        clearPendingChatTransfer();
        return false;
    }

    const currentTopicSlug = getTopicSlugFromChatRoot(chatRootElement);
    if (!currentTopicSlug || currentTopicSlug !== pendingTransferObject.topicSlug) {
        return false;
    }

    if (
        typeof pendingTransferObject.boxInnerHtmlString !== "string" ||
        pendingTransferObject.boxInnerHtmlString === ""
    ) {
        clearPendingChatTransfer();
        return false;
    }

    boxElement.innerHTML = pendingTransferObject.boxInnerHtmlString;
    clearPendingChatTransfer();

    if (window.console && typeof window.console.log === "function") {
        window.console.log("[Askee Chat]", "Transferred chat UI to topic:", currentTopicSlug);
    }

    return true;
}

// usuwa aktywny stan ze wszystkich przyciskow w wrapperze
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

// ustawia aktywny przycisk po porownaniu href
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

// ustawia aktywny przycisk po slugu strony z data atrybutu
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

    if (normalizeTopicSlug(pageSlug) === "chat") {
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

        const normalizedButtonIdValue = normalizeTopicSlug(buttonIdValue);
        const normalizedPageSlugValue = normalizeTopicSlug(pageSlug);
        if (
            normalizedButtonIdValue &&
            normalizedPageSlugValue &&
            normalizedButtonIdValue.endsWith("-" + normalizedPageSlugValue)
        ) {
            buttonElement.classList.add("button--active");
            matchedAnyButton = true;
        }
    }

    return matchedAnyButton;
}

// odswieza aktywny stan przyciskow nawigacji chatu
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

// uruchamia rotator tytulow w danym boxie
function initTitleRotator(boxElement) {
    const wrapperElement = boxElement.closest(".askee-chat__wrapper");
    if (!wrapperElement) return null;

    const rotatorElement = wrapperElement.querySelector(".askee-chat__title-rotator");
    if (!rotatorElement) return null;

    rotatorElement.classList.remove("is-ready");

    let trackElement = rotatorElement.querySelector(".askee-chat__title-track");
    let titlesArray = [];

    if (!trackElement) {
        titlesArray = Array.from(rotatorElement.querySelectorAll(".askee-chat__title"));
        if (titlesArray.length < 2) {
            rotatorElement.classList.add("is-ready");
            return null;
        }

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

    // liczy wysokosci i buduje animacje przesuwania tytulow
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

        rotatorElement.classList.add("is-ready");

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

// inicjalizuje jeden box chatu i podpina jego logike
function initSingleChatBox(boxElement) {
    if (boxElement.dataset.askeeBoxInitialized === "1") {
        return null;
    }
    boxElement.dataset.askeeBoxInitialized = "1";

    const chatRootElement = boxElement.closest(".askee-chat");
    tryApplyPendingChatTransfer(boxElement, chatRootElement);

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

    // zwraca aktywny element welcome gdzie pokazujemy odpowiedzi
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

    // czyści aktywny content i zostawia tylko welcome
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

    // rysuje kropki pisania zanim przyjdzie odpowiedz
    function renderTypingDotsIntoWelcome(welcomeElement) {
        if (!welcomeElement) {
            return;
        }

        welcomeElement.replaceChildren();

        const stateElement = document.createElement("div");
        stateElement.className = "askee-chat__dots-state";

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

        const messageElement = document.createElement("span");
        messageElement.className = "askee-chat__dots-label";
        messageElement.textContent = "Przygotowywanie odpowiedzi...";

        stateElement.appendChild(bubbleElement);
        stateElement.appendChild(messageElement);

        welcomeElement.appendChild(stateElement);
    }

    // renderuje tekst odpowiedzi z podzialem na linie i akapity
    function renderTextIntoWelcome(welcomeElement, textString, renderAsHtmlValue) {
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

        if (renderAsHtmlValue === true) {
            welcomeElement.innerHTML = normalizedTextString;
            return;
        }

        welcomeElement.innerHTML = markdownJs.makeHtml(normalizedTextString);
    }

    // pilnuje zeby tylko jeden content byl aktywny
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

    // znajduje content po id kliknietego przycisku
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

    // zatrzymuje poprzednia animacje przejscia
    function killActiveTimeline() {
        if (!activeTimeline) {
            return;
        }
        try {
            activeTimeline.kill();
        } catch (error) {}
        activeTimeline = null;
    }

    // czyści style ustawione przez gsap
    function clearGsapProps(element) {
        if (!element) {
            return;
        }
        try {
            gsap.set(element, { clearProps: "opacity,transform" });
        } catch (error) {}
    }

    // odpala animacje pierwszego widoku po zaladowaniu
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

    // przelacza widok chatu na wskazane id sekcji
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

    // event click na boxie chatu obsluguje przelaczanie sekcji
    function onChatRootClick(eventObject) {
        const clickedElement = eventObject.target;
        if (!clickedElement) {
            return;
        }

        if (!(clickedElement instanceof Element)) {
            return;
        }

        const suggestionButtonElement = clickedElement.closest(
            ".askee-chat__info-buttons .button.button--ghost"
        );
        if (suggestionButtonElement) {
            eventObject.preventDefault();
            if (!textareaElement || !formElement) {
                return;
            }

            const suggestionTextString = (suggestionButtonElement.textContent || "").trim();
            if (!suggestionTextString) {
                return;
            }

            textareaElement.value = suggestionTextString;

            const suggestionsWrapperElement = suggestionButtonElement.closest(
                ".askee-chat__info-buttons--suggestions"
            );
            const isStaticSuggestionButton =
                !!suggestionsWrapperElement &&
                suggestionsWrapperElement.classList.contains("askee-chat__info-buttons--static");

            if (isStaticSuggestionButton) {
                triggerChatFormSubmit();
                return;
            }

            textareaElement.focus();
            const endPositionNumber = textareaElement.value.length;
            textareaElement.setSelectionRange(endPositionNumber, endPositionNumber);
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

    // przelacza podstrone gdy asystent zwroci inny temat
    function trySwitchPageByAssistantTopic(topicSlugString) {
        if (!topicSlugString || !chatRootElement) {
            return;
        }

        const currentTopicSlug = getTopicSlugFromChatRoot(chatRootElement);
        if (!currentTopicSlug) {
            if (window.console && typeof window.console.log === "function") {
                window.console.log("[Askee Chat]", "Missing current topic in DOM.");
            }
            return;
        }

        if (currentTopicSlug === topicSlugString) {
            if (window.console && typeof window.console.log === "function") {
                window.console.log("[Askee Chat]", "Topic unchanged:", topicSlugString);
            }
            return;
        }

        const targetNavigationButtonElement = findNavigationButtonByTopic(
            chatRootElement,
            topicSlugString
        );

        if (!targetNavigationButtonElement) {
            if (window.console && typeof window.console.log === "function") {
                window.console.log(
                    "[Askee Chat]",
                    "Received topic without matching chat navigation button:",
                    topicSlugString
                );
            }
            return;
        }

        savePendingChatTransfer(topicSlugString, boxElement);

        if (window.console && typeof window.console.log === "function") {
            window.console.log(
                "[Askee Chat]",
                "Switching topic from",
                currentTopicSlug,
                "to",
                topicSlugString
            );
        }

        targetNavigationButtonElement.dispatchEvent(
            new MouseEvent("click", { bubbles: true, cancelable: true })
        );
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
    const userMessageElement = switchSectionsElement
        ? switchSectionsElement.querySelector(".askee-chat__user-message")
        : null;
    const userMessageParagraphElement = userMessageElement
        ? userMessageElement.querySelector("p")
        : null;

    let isSending = false; // blokowanie podwójnych wysyłek jakby ktoś spamował submitem
    let abortController = null;

    function triggerChatFormSubmit() {
        if (!formElement) {
            return;
        }

        if (typeof formElement.requestSubmit === "function") {
            formElement.requestSubmit();
            return;
        }

        formElement.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }

    function renderLatestUserMessage(messageTextString) {
        if (!userMessageElement || !userMessageParagraphElement) {
            return;
        }

        if (typeof messageTextString !== "string") {
            return;
        }

        const normalizedMessageTextString = messageTextString.trim();
        if (!normalizedMessageTextString) {
            return;
        }

        userMessageParagraphElement.textContent = normalizedMessageTextString;
        userMessageElement.style.display = "flex";
    }

    function renderSuggestionsButtons(suggestionsArray) {
        if (!activeContentElement) {
            return;
        }

        const existingSuggestionsElement = activeContentElement.querySelector(
            ".askee-chat__info-buttons--suggestions"
        );
        if (existingSuggestionsElement) {
            existingSuggestionsElement.remove();
        }

        const normalizedSuggestionsArray = normalizeSuggestionsArray(suggestionsArray);
        if (normalizedSuggestionsArray.length === 0) {
            return;
        }

        const suggestionsElement = document.createElement("div");
        suggestionsElement.className = "askee-chat__info-buttons askee-chat__info-buttons--suggestions";

        for (
            let suggestionIndexNumber = 0;
            suggestionIndexNumber < normalizedSuggestionsArray.length;
            suggestionIndexNumber += 1
        ) {
            const suggestionString = normalizedSuggestionsArray[suggestionIndexNumber];
            const suggestionButtonElement = document.createElement("button");
            suggestionButtonElement.type = "button";
            suggestionButtonElement.className = "button button--ghost";
            suggestionButtonElement.textContent = suggestionString;
            suggestionsElement.appendChild(suggestionButtonElement);
        }

        activeContentElement.appendChild(suggestionsElement);
    }

    // wysyla wiadomosc do backendu i zwraca odpowiedz json
    async function sendToApi(inputTextString) {
        if (!restUrl) {
            return null;
        }

        const currentTopicSlug = getTopicSlugFromChatRoot(chatRootElement);
        const requestPayloadObject = { input: inputTextString };

        if (currentTopicSlug) {
            requestPayloadObject.topic = currentTopicSlug;
        }

        // tymczasowe debugowanie
        if (window.console && typeof window.console.log === "function") {
            window.console.log("[Askee Chat]", "Sending request topic:", currentTopicSlug || "-");
            window.console.log("[Askee Chat]", "topicSent:", currentTopicSlug || "-");
            window.console.log("[Askee Chat]", "requestToWp:", requestPayloadObject);
        }

        abortController = new AbortController();

        // tu dzwonimy do jsona, odbiera chat-proxy.php
        const responseObject = await fetch(restUrl, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "X-WP-Nonce": nonce,
            },
            body: JSON.stringify(requestPayloadObject),
            signal: abortController.signal,
        });

        const parsedResponseObject = await responseObject.json().catch(function () {
            return null;
        });
        return parsedResponseObject;
    }

    // 2. PO SUBMIT ROZPOCZYNA SIE CALY CALL
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

        // zeby nikt nie klikal 100 razy
        if (isSending) {
            return;
        }

        isSending = true;
        if (submitButton) {
            submitButton.disabled = true;
        }

        renderLatestUserMessage(textValue);

        textareaElement.value = ""; // zerujemy wszystko i zaczynaja sie animacje itd

        // normalizacje i animacje
        normalizeToSingleActiveElement();
        const welcomeElement = resetActiveContentKeepOnlyWelcome();
        renderTypingDotsIntoWelcome(welcomeElement);

        try {
            const apiResponseObject = await sendToApi(textValue); // 3. BUDOWA PAYLOADU PRZEKAZUJAC MU TEXT VALUE
            const assistantPayloadObject =
                extractAssistantPayloadFromApiResponse(apiResponseObject);
            const assistantTopicSlug =
                assistantPayloadObject.topicSlugString ||
                extractAssistantTopicFromApiResponse(apiResponseObject);
            const sessionIdValue =
                apiResponseObject && typeof apiResponseObject.session === "string"
                    ? apiResponseObject.session
                    : "";

            if (window.console && typeof window.console.log === "function") {
                window.console.log("[Askee Chat]", "session:", sessionIdValue || "-");

                let upstreamPayloadObject = null;
                if (
                    apiResponseObject &&
                    apiResponseObject.upstreamPayload &&
                    typeof apiResponseObject.upstreamPayload === "object"
                ) {
                    upstreamPayloadObject = apiResponseObject.upstreamPayload;
                } else {
                    upstreamPayloadObject = {
                        Input: textValue,
                        topic: getTopicSlugFromChatRoot(chatRootElement),
                        session: sessionIdValue,
                    };
                }

                window.console.log("[Askee Chat]", "payload:", upstreamPayloadObject);
            }

            if (assistantTopicSlug && window.console && typeof window.console.log === "function") {
                window.console.log("[Askee Chat]", "Received response topic:", assistantTopicSlug);
                window.console.log("[Askee Chat]", "topicReceived:", assistantTopicSlug);
            }

            normalizeToSingleActiveElement();
            const welcomeElementAfterResponse = resetActiveContentKeepOnlyWelcome();

            // 7. SPRAWDZANIE TEGO CO PRZYSZŁO, NORMALIZACJE I RENDER ODPOWIEDZI
            if (apiResponseObject && apiResponseObject.ok) {
                let assistantTextString = assistantPayloadObject.textString;
                let renderAsHtmlValue = assistantPayloadObject.renderAsHtml;

                // fallback gdy parser payloadu nic nie wyciagnal
                if (!assistantTextString) {
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

                    const decodedFallbackTextString = decodeHtmlEntities(assistantTextString);
                    if (looksLikeHtmlString(decodedFallbackTextString)) {
                        assistantTextString = decodedFallbackTextString;
                        renderAsHtmlValue = true;
                    }
                }

                // tu renderujemy odpowiedź
                renderTextIntoWelcome(
                    welcomeElementAfterResponse,
                    assistantTextString,
                    renderAsHtmlValue
                );
                renderSuggestionsButtons(assistantPayloadObject.suggestionsArray);

                if (assistantTopicSlug) {
                    trySwitchPageByAssistantTopic(assistantTopicSlug);
                }
            } else {
                renderTextIntoWelcome(
                    welcomeElementAfterResponse,
                    "Przepraszamy, spróbuj ponownie"
                );
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

    // event click w boxie obsluguje przyciski nawigacji chatu
    boxElement.addEventListener("click", onChatRootClick);

    if (formElement) {
        // event submit formularza chatu
        formElement.addEventListener("submit", onFormSubmit);
    }

    if (textareaElement && formElement) {
        // event keydown zamienia enter na wysylke formularza
        textareaElement.addEventListener("keydown", function (eventObject) {
            if (!eventObject) {
                return;
            }

            if (eventObject.key === "Enter" && !eventObject.shiftKey) {
                eventObject.preventDefault();
                triggerChatFormSubmit();
            }
        });
    }

    normalizeToSingleActiveElement();
    animateInitialContentOnLoad();

    // sprzata eventy i animacje tego boxa przy cleanupie
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

// MAIN STUFF, inicjalizuje cala sekcje chat i zwraca cleanup
export function initAskeeChatSection(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;

    const chatRootElement = safeRootElement.querySelector(".askee-chat");
    if (!chatRootElement) {
        return null;
    }

    const boxesNodeList = chatRootElement.querySelectorAll(".askee-chat__box");
    const cleanupFunctionsArray = [];

    // w razie jak jest wiecej chatboxow jak bylo w designie na blogu
    for (let index = 0; index < boxesNodeList.length; index += 1) {
        const boxElement = boxesNodeList[index];
        const cleanupFunction = initSingleChatBox(boxElement);
        if (typeof cleanupFunction === "function") {
            cleanupFunctionsArray.push(cleanupFunction);
        }
    }

    updateChatNavigationButtonsActiveState(chatRootElement);

    // event po nawigacji odswieza aktywne przyciski w chacie
    function onAskeeNavigationCompleteEvent() {
        updateChatNavigationButtonsActiveState(chatRootElement);
    }

    // event globalny po zmianie strony w spa
    window.addEventListener("askee:navigation:complete", onAskeeNavigationCompleteEvent);

    // event zewnetrzny do przelaczenia chatu z innego miejsca
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

    // event custom z dokumentu dla zewnetrznego switcha
    document.addEventListener("askee:chat:external-switch", onExternalSwitch);

    // cleanup odpina eventy i cleanupy wszystkich boxow
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
