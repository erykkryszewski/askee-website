import { gsap } from "gsap";

export function initAskeeChatSection(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;

    const chatRootElement = safeRootElement.querySelector(".askee-chat");
    if (!chatRootElement) {
        return null;
    }

    if (chatRootElement.dataset.askeeChatInitialized === "1") {
        return null;
    }
    chatRootElement.dataset.askeeChatInitialized = "1";

    const switchSectionsElement = chatRootElement.querySelector(".askee-chat__switch-sections");
    if (!switchSectionsElement) {
        return null;
    }

    const contentElementsArray = Array.from(
        switchSectionsElement.querySelectorAll(".askee-chat__content")
    );

    const navigationButtonsWrapperElement = chatRootElement.querySelector(".askee-chat__buttons");

    let activeContentElement = switchSectionsElement.querySelector(".askee-chat__content--active");
    let activeTimeline = null;

    function normalizeToSingleActiveElement() {
        if (!activeContentElement) {
            const defaultElement = chatRootElement.querySelector("#askee-chat-content-default");
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

        const targetElement = chatRootElement.querySelector(`#${CSS.escape(targetId)}`);
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
        try {
            gsap.set(element, { clearProps: "opacity,transform" });
        } catch (error) {}
    }

    function transitionToTargetId(targetId) {
        const targetElement = findTargetContentElement(targetId);
        if (!targetElement) {
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
        if (navigationTargetElement) {
            const targetId = navigationTargetElement.dataset.id;
            if (targetId) {
                event.preventDefault();
                transitionToTargetId(targetId);
            }
            return;
        }
    }

    function onExternalSwitch(event) {
        if (!event.detail || !event.detail.targetId) {
            return;
        }
        transitionToTargetId(event.detail.targetId);
    }

    const chatConfig = window.AskeeChatConfig || {};
    const storageKey =
        typeof chatConfig.storageKey === "string" ? chatConfig.storageKey : "askee_chat_state_v1";
    const restUrl = typeof chatConfig.restUrl === "string" ? chatConfig.restUrl : "";
    const nonce = typeof chatConfig.nonce === "string" ? chatConfig.nonce : "";

    function loadChatState() {
        try {
            const raw = sessionStorage.getItem(storageKey);
            if (!raw) {
                return { messages: [] };
            }
            const parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.messages)) {
                return { messages: [] };
            }
            return parsed;
        } catch (error) {
            return { messages: [] };
        }
    }

    function saveChatState(state) {
        try {
            sessionStorage.setItem(storageKey, JSON.stringify(state));
        } catch (error) {}
    }

    const formElement = chatRootElement.querySelector(".askee-chat__form");
    const textareaElement = formElement ? formElement.querySelector(".askee-chat__textarea") : null;
    const submitButton = formElement ? formElement.querySelector('[type="submit"]') : null;

    let isSending = false;
    let abortController = null;

    function pushMessage(role, text) {
        const state = loadChatState();
        state.messages.push({
            role,
            text,
            ts: Date.now(),
        });
        saveChatState(state);
        console.log("[Askee Chat] History Updated:", state.messages);
    }

    async function sendToApi(inputText) {
        if (!restUrl) {
            console.error("Missing restUrl");
            return null;
        }

        abortController = new AbortController();

        const response = await fetch(restUrl, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "X-WP-Nonce": nonce,
            },
            body: JSON.stringify({ input: inputText }),
            signal: abortController.signal,
        });

        const data = await response.json().catch(() => null);
        return data;
    }

    async function onFormSubmit(event) {
        event.preventDefault();

        if (!textareaElement) {
            return;
        }

        const text = (textareaElement.value || "").trim();
        if (!text) {
            return;
        }

        if (isSending) {
            return;
        }

        isSending = true;
        if (submitButton) {
            submitButton.disabled = true;
        }

        pushMessage("user", text);

        textareaElement.value = "";

        try {
            const apiResponse = await sendToApi(text);

            console.log("[Askee Chat] Raw Response:", apiResponse);

            if (apiResponse && apiResponse.ok) {
                let assistantText = "Empty response";

                if (
                    apiResponse.json &&
                    Array.isArray(apiResponse.json) &&
                    apiResponse.json[0] &&
                    apiResponse.json[0].output
                ) {
                    assistantText = apiResponse.json[0].output;
                } else if (typeof apiResponse.raw === "string") {
                    assistantText = apiResponse.raw;
                }

                pushMessage("assistant", assistantText);
            } else {
                pushMessage("assistant", "Upstream Error");
            }
        } catch (error) {
            if (error && error.name === "AbortError") {
            } else {
                console.error(error);
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

    const existingState = loadChatState();
    if (existingState.messages.length) {
        console.log("[Askee Chat] Restored History:", existingState.messages);
    }

    chatRootElement.addEventListener("click", onChatRootClick);
    document.addEventListener("askee:chat:external-switch", onExternalSwitch);

    if (formElement) {
        formElement.addEventListener("submit", onFormSubmit);
    }

    if (textareaElement) {
        textareaElement.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                formElement.dispatchEvent(new Event("submit"));
            }
        });
    }

    normalizeToSingleActiveElement();

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
        delete chatRootElement.dataset.askeeChatInitialized;
    };
}
