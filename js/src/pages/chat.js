import { gsap } from "gsap";

export function initAskeeChatPage(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;
    const pageElement = safeRootElement.querySelector('[data-askee-page="chat"]');

    if (!pageElement) {
        return;
    }

    if (pageElement.dataset.askeeInitialized === "1") {
        return;
    }

    pageElement.dataset.askeeInitialized = "1";

    const navigationButtons = pageElement.querySelectorAll(".askee-chat__buttons button");

    function updateActiveButtons(targetId) {
        navigationButtons.forEach((btn) => {
            btn.classList.remove("button--active");
            if (btn.dataset.id === targetId) {
                btn.classList.add("button--active");
            }
        });
    }

    function activateTargetElement(element) {
        element.classList.add("askee-chat__content--active");
        gsap.fromTo(
            element,
            { opacity: 0, y: 10, display: "block" },
            { duration: 0.4, opacity: 1, y: 0, clearProps: "transform" }
        );
    }

    function transitionToNewView(targetId) {
        const currentActiveElement = pageElement.querySelector(".askee-chat__content--active");
        const targetElement = pageElement.querySelector(`#${targetId}`);

        updateActiveButtons(targetId);

        if (!targetElement || currentActiveElement === targetElement) {
            return;
        }

        if (currentActiveElement) {
            gsap.to(currentActiveElement, {
                duration: 0.3,
                opacity: 0,
                y: -10,
                onComplete: () => {
                    currentActiveElement.classList.remove("askee-chat__content--active");
                    currentActiveElement.style.display = "";
                    activateTargetElement(targetElement);
                },
            });
        } else {
            activateTargetElement(targetElement);
        }
    }

    const storedTarget = sessionStorage.getItem("askee-chat-target");
    if (storedTarget) {
        sessionStorage.removeItem("askee-chat-target");
        setTimeout(() => {
            transitionToNewView(storedTarget);
        }, 100);
    }

    document.addEventListener("askee:chat:external-switch", (event) => {
        if (event.detail && event.detail.targetId) {
            transitionToNewView(event.detail.targetId);
        }
    });

    navigationButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            const targetId = button.dataset.id;
            if (targetId) {
                transitionToNewView(targetId);
            }
        });
    });
}
