import { gsap } from "gsap";

export function initAskeeChatSection(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;

    const chatRootElement = safeRootElement.querySelector(".askee-chat");
    if (!chatRootElement) {
        return null;
    }

    const switchSectionsElement = chatRootElement.querySelector(".askee-chat__switch-sections");
    if (!switchSectionsElement) {
        return null;
    }

    const contentElementsArray = Array.from(
        switchSectionsElement.querySelectorAll(".askee-chat__content")
    );

    if (contentElementsArray.length === 0) {
        return null;
    }

    const navigationButtonsWrapperElement = chatRootElement.querySelector(".askee-chat__buttons");

    let activeContentElement =
        switchSectionsElement.querySelector(".askee-chat__content--active") ||
        contentElementsArray[0] ||
        null;

    let activeTimeline = null;

    function getChatRoutesObject() {
        const configObject = window.AskeeThemeConfig || {};
        const routesObject = configObject.chatRoutes;
        if (!routesObject || typeof routesObject !== "object") {
            return null;
        }
        return routesObject;
    }

    function resolveUrlByTargetId(targetId) {
        const routesObject = getChatRoutesObject();
        if (!routesObject) {
            return null;
        }

        const routeValue = routesObject[targetId];
        if (typeof routeValue !== "string" || routeValue.trim() === "") {
            return null;
        }

        try {
            return new URL(routeValue, window.location.href).href;
        } catch (error) {
            return null;
        }
    }

    function tryNavigateToTargetId(targetId) {
        const resolvedUrlString = resolveUrlByTargetId(targetId);
        if (!resolvedUrlString) {
            return false;
        }

        if (resolvedUrlString === window.location.href) {
            return false;
        }

        sessionStorage.setItem("askee-chat-target", targetId);

        if (typeof window.AskeeSpaNavigateToUrl === "function") {
            window.AskeeSpaNavigateToUrl(resolvedUrlString);
            return true;
        }

        window.location.href = resolvedUrlString;
        return true;
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
        try {
            gsap.set(element, { clearProps: "opacity,transform" });
        } catch (error) {}
    }

    function normalizeToSingleActiveElement() {
        if (!activeContentElement) {
            activeContentElement = contentElementsArray[0] || null;
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
            clearGsapProps(element);
        }
    }

    function updateActiveButtons(targetId) {
        if (!navigationButtonsWrapperElement) {
            return;
        }

        const buttonsArray = navigationButtonsWrapperElement.querySelectorAll("[data-id]");
        for (let index = 0; index < buttonsArray.length; index += 1) {
            const buttonElement = buttonsArray[index];
            buttonElement.classList.remove("button--active");

            if (buttonElement.dataset.id === targetId) {
                buttonElement.classList.add("button--active");
            }
        }
    }

    function findTargetContentElement(targetId) {
        if (!targetId) {
            return null;
        }

        let targetElement = null;

        try {
            targetElement = chatRootElement.querySelector(`#${CSS.escape(targetId)}`);
        } catch (error) {
            targetElement = chatRootElement.querySelector(`#${targetId}`);
        }

        if (!targetElement) {
            return null;
        }

        if (!targetElement.classList.contains("askee-chat__content")) {
            return null;
        }

        return targetElement;
    }

    function transitionToTargetId(targetId) {
        const targetElement = findTargetContentElement(targetId);

        if (!targetElement) {
            tryNavigateToTargetId(targetId);
            return;
        }

        if (targetElement === activeContentElement) {
            updateActiveButtons(targetId);
            return;
        }

        updateActiveButtons(targetId);

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
        clearGsapProps(targetElement);

        if (previousElement) {
            clearGsapProps(previousElement);
        }

        activeTimeline = gsap.timeline({
            onComplete: () => {
                if (previousElement) {
                    previousElement.classList.remove("askee-chat__content--active");
                    previousElement.style.display = "none";
                    clearGsapProps(previousElement);
                }

                clearGsapProps(targetElement);
                activeContentElement = targetElement;
                activeTimeline = null;
            },
        });

        gsap.set(targetElement, { opacity: 0, y: 10 });

        if (previousElement) {
            activeTimeline.to(previousElement, { duration: 0.2, opacity: 0, y: -10 }, 0);
        }

        activeTimeline.to(targetElement, { duration: 0.3, opacity: 1, y: 0 }, 0);
    }

    function onChatRootClick(event) {
        const clickedElement = event.target;

        const navigationTargetElement = clickedElement.closest(".askee-chat__buttons [data-id]");
        if (!navigationTargetElement) {
            return;
        }

        const targetId = navigationTargetElement.dataset.id;
        if (!targetId) {
            return;
        }

        event.preventDefault();
        transitionToTargetId(targetId);
    }

    function onExternalSwitch(event) {
        if (!event.detail || !event.detail.targetId) {
            return;
        }
        transitionToTargetId(event.detail.targetId);
    }

    chatRootElement.addEventListener("click", onChatRootClick);
    document.addEventListener("askee:chat:external-switch", onExternalSwitch);

    normalizeToSingleActiveElement();

    const currentVisibleContentElement =
        switchSectionsElement.querySelector(".askee-chat__content--active") ||
        contentElementsArray[0] ||
        null;

    if (currentVisibleContentElement && currentVisibleContentElement.id) {
        updateActiveButtons(currentVisibleContentElement.id);
    }

    const storedTargetId = sessionStorage.getItem("askee-chat-target");
    if (storedTargetId) {
        sessionStorage.removeItem("askee-chat-target");
        setTimeout(() => {
            transitionToTargetId(storedTargetId);
        }, 50);
    }

    return function cleanupAskeeChatSection() {
        chatRootElement.removeEventListener("click", onChatRootClick);
        document.removeEventListener("askee:chat:external-switch", onExternalSwitch);
        killActiveTimeline();
    };
}
