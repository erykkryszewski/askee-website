import $ from "jquery";
import "slick-carousel";

const HOMEPAGE_INITIAL_DELAY_MS = 500;
const HOMEPAGE_TYPING_CHAR_DELAY_MS = 32;
const HOMEPAGE_BETWEEN_BOXES_DELAY_MS = 360;
const HOMEPAGE_AFTER_SLIDE_DELAY_MS = 2000;
const HOMEPAGE_FINAL_REDIRECT_DELAY_MS = 2000;

function normalizeTypingText(textString) {
    if (typeof textString !== "string") {
        return "";
    }

    return textString.replace(/\s+/g, " ").trim();
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
    textString,
    runIdNumber,
    sliderRuntimeObject,
    charDelayNumber,
}) {
    return new Promise((resolve) => {
        if (!element) {
            resolve(true);
            return;
        }

        const safeTextString = typeof textString === "string" ? textString : "";
        element.textContent = "";

        if (!safeTextString) {
            resolve(true);
            return;
        }

        let textIndexNumber = 0;

        function renderNextCharacter() {
            if (
                sliderRuntimeObject.destroyed ||
                sliderRuntimeObject.activeRunIdNumber !== runIdNumber
            ) {
                resolve(false);
                return;
            }

            textIndexNumber += 1;
            element.textContent = safeTextString.slice(0, textIndexNumber);

            if (textIndexNumber >= safeTextString.length) {
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
            const leftParagraphElement = slideElement.querySelector(".askee-homepage__box--left p");
            const rightParagraphElement = slideElement.querySelector(".askee-homepage__box--right p");

            const leftOriginalHtmlString = leftParagraphElement ? leftParagraphElement.innerHTML : "";
            const rightOriginalHtmlString = rightParagraphElement ? rightParagraphElement.innerHTML : "";

            return {
                slideElement,
                leftParagraphElement,
                rightParagraphElement,
                leftOriginalHtmlString,
                rightOriginalHtmlString,
                leftTextString: normalizeTypingText(
                    leftParagraphElement ? leftParagraphElement.textContent || "" : ""
                ),
                rightTextString: normalizeTypingText(
                    rightParagraphElement ? rightParagraphElement.textContent || "" : ""
                ),
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
            slideStateObject.slideElement.classList.add("askee-homepage__item--left-visible");

            const leftTypingFinished = await typeText({
                element: slideStateObject.leftParagraphElement,
                textString: slideStateObject.leftTextString,
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
                textString: slideStateObject.rightTextString,
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
