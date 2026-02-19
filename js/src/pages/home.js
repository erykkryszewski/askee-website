import $ from "jquery";
import "slick-carousel";

const HOMEPAGE_INITIAL_DELAY_MS = 500;
const HOMEPAGE_TYPING_CHAR_DELAY_MS = 32;
const HOMEPAGE_BETWEEN_BOXES_DELAY_MS = 360;
const HOMEPAGE_AFTER_SLIDE_DELAY_MS = 2000;
const HOMEPAGE_FINAL_REDIRECT_DELAY_MS = 2000;

function escapeHtml(textString) {
    if (typeof textString !== "string") {
        return "";
    }

    return textString
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function buildTypingCharsArrayFromHtml(htmlString) {
    const safeHtmlString = typeof htmlString === "string" ? htmlString : "";
    const parserContainerElement = document.createElement("div");
    parserContainerElement.innerHTML = safeHtmlString;

    const charsArray = [];

    function appendCharacter(characterString, isStrong) {
        const normalizedCharacterString = /\s/.test(characterString) ? " " : characterString;
        const previousCharacterObject = charsArray.length > 0 ? charsArray[charsArray.length - 1] : null;
        if (
            normalizedCharacterString === " " &&
            (!previousCharacterObject || previousCharacterObject.characterString === " ")
        ) {
            return;
        }

        charsArray.push({
            characterString: normalizedCharacterString,
            isStrong,
        });
    }

    function walkNode(node, inheritedStrongState) {
        if (!node) {
            return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            const textString = node.textContent || "";
            for (let index = 0; index < textString.length; index += 1) {
                appendCharacter(textString.charAt(index), inheritedStrongState);
            }
            return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        const elementNode = node;
        const tagNameString = typeof elementNode.tagName === "string" ? elementNode.tagName : "";
        const isStrongElement = tagNameString.toLowerCase() === "strong";
        const nextStrongState = inheritedStrongState || isStrongElement;

        const childNodesArray = Array.from(elementNode.childNodes);
        for (let index = 0; index < childNodesArray.length; index += 1) {
            walkNode(childNodesArray[index], nextStrongState);
        }
    }

    const rootChildNodesArray = Array.from(parserContainerElement.childNodes);
    for (let index = 0; index < rootChildNodesArray.length; index += 1) {
        walkNode(rootChildNodesArray[index], false);
    }

    while (charsArray.length > 0 && charsArray[0].characterString === " ") {
        charsArray.shift();
    }
    while (charsArray.length > 0 && charsArray[charsArray.length - 1].characterString === " ") {
        charsArray.pop();
    }

    return charsArray;
}

function renderTypingHtml(charsArray, visibleCharsCountNumber) {
    if (!Array.isArray(charsArray) || charsArray.length === 0) {
        return "";
    }

    const safeVisibleCharsCountNumber = Math.max(
        0,
        Math.min(charsArray.length, visibleCharsCountNumber)
    );
    if (safeVisibleCharsCountNumber === 0) {
        return "";
    }

    let htmlString = "";
    let chunkString = "";
    let chunkStrongState = null;

    function flushChunk() {
        if (!chunkString) {
            return;
        }

        const escapedChunkString = escapeHtml(chunkString);
        if (chunkStrongState) {
            htmlString += "<strong>" + escapedChunkString + "</strong>";
        } else {
            htmlString += escapedChunkString;
        }
        chunkString = "";
    }

    for (let index = 0; index < safeVisibleCharsCountNumber; index += 1) {
        const characterObject = charsArray[index];
        if (!characterObject) {
            continue;
        }

        const nextStrongState = characterObject.isStrong === true;
        if (chunkStrongState === null) {
            chunkStrongState = nextStrongState;
        }

        if (nextStrongState !== chunkStrongState) {
            flushChunk();
            chunkStrongState = nextStrongState;
        }

        chunkString += characterObject.characterString;
    }

    flushChunk();
    return htmlString;
}

function clearRuntimeTimeouts(sliderRuntimeObject) {
    for (let index = 0; index < sliderRuntimeObject.timeoutIdsArray.length; index += 1) {
        window.clearTimeout(sliderRuntimeObject.timeoutIdsArray[index]);
    }
    sliderRuntimeObject.timeoutIdsArray = [];
}

function cancelRuntimeSequence(sliderRuntimeObject) {
    sliderRuntimeObject.activeRunIdNumber += 1;
    clearRuntimeTimeouts(sliderRuntimeObject);
}

function waitForRuntime(delayNumber, sliderRuntimeObject, runIdNumber) {
    return new Promise((resolve) => {
        const safeDelayNumber = Number.isFinite(delayNumber) ? Math.max(0, delayNumber) : 0;

        if (safeDelayNumber === 0) {
            resolve(true);
            return;
        }

        const timeoutIdNumber = window.setTimeout(() => {
            if (
                sliderRuntimeObject.destroyed ||
                sliderRuntimeObject.activeRunIdNumber !== runIdNumber
            ) {
                resolve(false);
                return;
            }

            resolve(true);
        }, safeDelayNumber);

        sliderRuntimeObject.timeoutIdsArray.push(timeoutIdNumber);
    });
}

function typeText({
    element,
    charsArray,
    runIdNumber,
    sliderRuntimeObject,
    charDelayNumber,
}) {
    return new Promise((resolve) => {
        if (!element) {
            resolve(true);
            return;
        }

        const safeCharsArray = Array.isArray(charsArray) ? charsArray : [];
        element.innerHTML = "";

        if (safeCharsArray.length === 0) {
            resolve(true);
            return;
        }

        let visibleCharsCountNumber = 0;

        function renderNextCharacter() {
            if (
                sliderRuntimeObject.destroyed ||
                sliderRuntimeObject.activeRunIdNumber !== runIdNumber
            ) {
                resolve(false);
                return;
            }

            visibleCharsCountNumber += 1;
            element.innerHTML = renderTypingHtml(safeCharsArray, visibleCharsCountNumber);

            if (visibleCharsCountNumber >= safeCharsArray.length) {
                resolve(true);
                return;
            }

            const timeoutIdNumber = window.setTimeout(renderNextCharacter, charDelayNumber);
            sliderRuntimeObject.timeoutIdsArray.push(timeoutIdNumber);
        }

        renderNextCharacter();
    });
}

function triggerHomeCompletionNavigation(homePageContainer) {
    const targetPathString = "/porozmawiajmy";

    let targetButtonElement =
        homePageContainer.querySelector('.button--header[href*="/porozmawiajmy"]') ||
        document.querySelector('.button--header[href*="/porozmawiajmy"]');

    if (!targetButtonElement) {
        targetButtonElement = homePageContainer.querySelector(".button--header");
    }
    if (!targetButtonElement) {
        targetButtonElement = document.querySelector(".button--header");
    }

    if (targetButtonElement) {
        targetButtonElement.dispatchEvent(
            new MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                view: window,
            })
        );
        return;
    }

    if (typeof window.AskeeSpaNavigateToUrl === "function") {
        window.AskeeSpaNavigateToUrl(targetPathString);
        return;
    }

    window.location.assign(targetPathString);
}

function resetSlideSequenceClasses(slideElement) {
    if (!slideElement) {
        return;
    }

    slideElement.classList.remove(
        "askee-homepage__item--started",
        "askee-homepage__item--left-visible",
        "askee-homepage__item--right-visible",
        "askee-homepage__item--complete"
    );
}

export function initAskeeHomePage(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;
    const homePageContainer = safeRootElement.querySelector('[data-askee-page="home"]');

    if (!homePageContainer) {
        return null;
    }

    if (homePageContainer.dataset.askeePageInitialized === "1") {
        return null;
    }
    homePageContainer.dataset.askeePageInitialized = "1";

    const initializedSlidersArray = [];

    const homepageSliders = homePageContainer.querySelectorAll(".askee-homepage__slider");

    homepageSliders.forEach((singleSlider) => {
        const jquerySliderInstance = $(singleSlider);

        if (jquerySliderInstance.hasClass("slick-initialized")) {
            return;
        }

        singleSlider.classList.add("askee-homepage__slider--pending");
        singleSlider.classList.add("askee-homepage__slider--sequence-enabled");

        const slideStatesArray = Array.from(
            singleSlider.querySelectorAll(".askee-homepage__item")
        ).map((slideElement) => {
            const leftBoxElement = slideElement.querySelector(".askee-homepage__box--left");
            const rightBoxElement = slideElement.querySelector(".askee-homepage__box--right");
            const leftParagraphElement = slideElement.querySelector(".askee-homepage__box--left p");
            const rightParagraphElement = slideElement.querySelector(".askee-homepage__box--right p");

            const leftOriginalHtmlString = leftParagraphElement ? leftParagraphElement.innerHTML : "";
            const rightOriginalHtmlString = rightParagraphElement ? rightParagraphElement.innerHTML : "";

            return {
                slideElement,
                leftBoxElement,
                rightBoxElement,
                leftParagraphElement,
                rightParagraphElement,
                leftOriginalHtmlString,
                rightOriginalHtmlString,
                leftCharsArray: buildTypingCharsArrayFromHtml(leftOriginalHtmlString),
                rightCharsArray: buildTypingCharsArrayFromHtml(rightOriginalHtmlString),
                leftBoxMinHeightNumber: 0,
                rightBoxMinHeightNumber: 0,
                completed: false,
            };
        });

        const sliderRuntimeObject = {
            destroyed: false,
            activeRunIdNumber: 0,
            timeoutIdsArray: [],
            finalNavigationTriggered: false,
        };

        function resetSlideToInitialState(slideStateObject) {
            if (!slideStateObject) {
                return;
            }

            resetSlideSequenceClasses(slideStateObject.slideElement);

            if (slideStateObject.leftParagraphElement) {
                slideStateObject.leftParagraphElement.innerHTML =
                    slideStateObject.leftOriginalHtmlString;
            }
            if (slideStateObject.rightParagraphElement) {
                slideStateObject.rightParagraphElement.innerHTML =
                    slideStateObject.rightOriginalHtmlString;
            }
        }

        function setSlideAsCompleted(slideStateObject) {
            if (!slideStateObject) {
                return;
            }

            if (slideStateObject.leftParagraphElement) {
                slideStateObject.leftParagraphElement.innerHTML =
                    slideStateObject.leftOriginalHtmlString;
            }
            if (slideStateObject.rightParagraphElement) {
                slideStateObject.rightParagraphElement.innerHTML =
                    slideStateObject.rightOriginalHtmlString;
            }

            resetSlideSequenceClasses(slideStateObject.slideElement);
            slideStateObject.slideElement.classList.add(
                "askee-homepage__item--started",
                "askee-homepage__item--left-visible",
                "askee-homepage__item--right-visible",
                "askee-homepage__item--complete"
            );
        }

        function lockSlideBoxHeights(slideStateObject) {
            if (!slideStateObject) {
                return;
            }

            if (
                slideStateObject.leftBoxElement &&
                slideStateObject.leftBoxMinHeightNumber <= 0
            ) {
                const measuredLeftHeightNumber = slideStateObject.leftBoxElement.offsetHeight;
                if (measuredLeftHeightNumber > 0) {
                    slideStateObject.leftBoxMinHeightNumber = measuredLeftHeightNumber;
                    slideStateObject.leftBoxElement.style.minHeight =
                        String(measuredLeftHeightNumber) + "px";
                }
            }

            if (
                slideStateObject.rightBoxElement &&
                slideStateObject.rightBoxMinHeightNumber <= 0
            ) {
                const measuredRightHeightNumber = slideStateObject.rightBoxElement.offsetHeight;
                if (measuredRightHeightNumber > 0) {
                    slideStateObject.rightBoxMinHeightNumber = measuredRightHeightNumber;
                    slideStateObject.rightBoxElement.style.minHeight =
                        String(measuredRightHeightNumber) + "px";
                }
            }
        }

        slideStatesArray.forEach((slideStateObject) => {
            resetSlideToInitialState(slideStateObject);
        });

        async function runSlideSequence(slideIndexNumber, delayBeforeStartNumber) {
            const slideStateObject = slideStatesArray[slideIndexNumber];
            if (!slideStateObject) {
                return;
            }

            cancelRuntimeSequence(sliderRuntimeObject);
            const runIdNumber = sliderRuntimeObject.activeRunIdNumber;

            if (slideStateObject.completed) {
                setSlideAsCompleted(slideStateObject);
                return;
            }

            resetSlideToInitialState(slideStateObject);

            const canStartSequence = await waitForRuntime(
                delayBeforeStartNumber,
                sliderRuntimeObject,
                runIdNumber
            );
            if (!canStartSequence) {
                return;
            }

            slideStateObject.slideElement.classList.add("askee-homepage__item--started");
            lockSlideBoxHeights(slideStateObject);
            slideStateObject.slideElement.classList.add("askee-homepage__item--left-visible");

            const leftTypingFinished = await typeText({
                element: slideStateObject.leftParagraphElement,
                charsArray: slideStateObject.leftCharsArray,
                runIdNumber,
                sliderRuntimeObject,
                charDelayNumber: HOMEPAGE_TYPING_CHAR_DELAY_MS,
            });
            if (!leftTypingFinished) {
                return;
            }

            if (slideStateObject.leftParagraphElement) {
                slideStateObject.leftParagraphElement.innerHTML =
                    slideStateObject.leftOriginalHtmlString;
            }

            const canStartRight = await waitForRuntime(
                HOMEPAGE_BETWEEN_BOXES_DELAY_MS,
                sliderRuntimeObject,
                runIdNumber
            );
            if (!canStartRight) {
                return;
            }

            slideStateObject.slideElement.classList.add("askee-homepage__item--right-visible");

            const rightTypingFinished = await typeText({
                element: slideStateObject.rightParagraphElement,
                charsArray: slideStateObject.rightCharsArray,
                runIdNumber,
                sliderRuntimeObject,
                charDelayNumber: HOMEPAGE_TYPING_CHAR_DELAY_MS,
            });
            if (!rightTypingFinished) {
                return;
            }

            if (slideStateObject.rightParagraphElement) {
                slideStateObject.rightParagraphElement.innerHTML =
                    slideStateObject.rightOriginalHtmlString;
            }

            slideStateObject.slideElement.classList.add("askee-homepage__item--complete");
            slideStateObject.completed = true;

            const isLastSlide = slideIndexNumber === slideStatesArray.length - 1;
            if (!isLastSlide) {
                const canMoveToNextSlide = await waitForRuntime(
                    HOMEPAGE_AFTER_SLIDE_DELAY_MS,
                    sliderRuntimeObject,
                    runIdNumber
                );
                if (!canMoveToNextSlide) {
                    return;
                }

                if (jquerySliderInstance.hasClass("slick-initialized")) {
                    jquerySliderInstance.slick("slickNext");
                }
                return;
            }

            const canRunFinalNavigation = await waitForRuntime(
                HOMEPAGE_FINAL_REDIRECT_DELAY_MS,
                sliderRuntimeObject,
                runIdNumber
            );
            if (!canRunFinalNavigation) {
                return;
            }

            if (sliderRuntimeObject.finalNavigationTriggered) {
                return;
            }

            sliderRuntimeObject.finalNavigationTriggered = true;
            triggerHomeCompletionNavigation(homePageContainer);
        }

        function onSlickBeforeChange(eventObject, slickObject, currentSlideNumber) {
            cancelRuntimeSequence(sliderRuntimeObject);

            const previousSlideStateObject = slideStatesArray[currentSlideNumber];
            if (!previousSlideStateObject) {
                return;
            }

            if (!previousSlideStateObject.completed) {
                resetSlideToInitialState(previousSlideStateObject);
            }
        }

        function onSlickAfterChange(eventObject, slickObject, currentSlideNumber) {
            runSlideSequence(currentSlideNumber, 0);
        }

        jquerySliderInstance.one("init", (eventObject, slickObject) => {
            singleSlider.classList.remove("askee-homepage__slider--pending");

            let initialSlideNumber = 0;
            if (slickObject && typeof slickObject.currentSlide === "number") {
                initialSlideNumber = slickObject.currentSlide;
            }

            runSlideSequence(initialSlideNumber, HOMEPAGE_INITIAL_DELAY_MS);
        });

        jquerySliderInstance.on("beforeChange", onSlickBeforeChange);
        jquerySliderInstance.on("afterChange", onSlickAfterChange);

        const slickConfiguration = {
            infinite: false,
            slidesToShow: 1,
            slidesToScroll: 1,
            dots: true,
            arrows: false,
            autoplay: false,
            autoplaySpeed: 4000,
            fade: true,
            cssEase: "linear",
        };

        jquerySliderInstance.slick(slickConfiguration);
        initializedSlidersArray.push({
            sliderElement: singleSlider,
            jquerySliderInstance,
            sliderRuntimeObject,
            onSlickBeforeChange,
            onSlickAfterChange,
        });
    });

    return function cleanupAskeeHomePage() {
        for (let index = 0; index < initializedSlidersArray.length; index += 1) {
            const initializedSliderObject = initializedSlidersArray[index];
            try {
                const { sliderElement, jquerySliderInstance, sliderRuntimeObject } =
                    initializedSliderObject;

                sliderRuntimeObject.destroyed = true;
                cancelRuntimeSequence(sliderRuntimeObject);

                jquerySliderInstance.off(
                    "beforeChange",
                    initializedSliderObject.onSlickBeforeChange
                );
                jquerySliderInstance.off("afterChange", initializedSliderObject.onSlickAfterChange);

                if (jquerySliderInstance.hasClass("slick-initialized")) {
                    jquerySliderInstance.slick("unslick");
                }
                sliderElement.classList.remove("askee-homepage__slider--pending");
                sliderElement.classList.remove("askee-homepage__slider--sequence-enabled");
            } catch (error) {}
        }
    };
}
