// inicjalizuje wszystkie formularze kontaktowe na stronie i podpina ich logike
export function initAskeeContactFormSection(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;

    const formElementsArray = Array.from(
        safeRootElement.querySelectorAll(".askee-contact-form")
    );

    if (formElementsArray.length === 0) {
        return null;
    }

    const cleanupFunctionsArray = [];

    for (let formIndexNumber = 0; formIndexNumber < formElementsArray.length; formIndexNumber += 1) {
        const formElement = formElementsArray[formIndexNumber];
        const cleanupFunction = initSingleAskeeContactForm(formElement);
        if (typeof cleanupFunction === "function") {
            cleanupFunctionsArray.push(cleanupFunction);
        }
    }

    if (cleanupFunctionsArray.length === 0) {
        return null;
    }

    return function cleanupAskeeContactFormSection() {
        for (let index = 0; index < cleanupFunctionsArray.length; index += 1) {
            try {
                cleanupFunctionsArray[index]();
            } catch (error) {}
        }
    };
}

// pojedyncza instancja formularza kontaktowego
function initSingleAskeeContactForm(formElement) {
    if (!(formElement instanceof HTMLElement)) {
        return null;
    }

    if (formElement.dataset.askeeContactFormInitialized === "1") {
        return null;
    }
    formElement.dataset.askeeContactFormInitialized = "1";

    const contactConfigObject = window.AskeeContactConfig || {};
    const restUrlString =
        typeof contactConfigObject.restUrl === "string" ? contactConfigObject.restUrl : "";
    const nonceRefreshUrlString =
        typeof contactConfigObject.nonceRefreshUrl === "string"
            ? contactConfigObject.nonceRefreshUrl
            : "";
    const honeypotFieldNameString =
        typeof contactConfigObject.honeypotFieldName === "string" &&
        contactConfigObject.honeypotFieldName !== ""
            ? contactConfigObject.honeypotFieldName
            : "askee_website_url";

    let currentNonceString =
        typeof contactConfigObject.nonce === "string" ? contactConfigObject.nonce : "";

    // wstawiamy timestamp zaladowania formularza (bot zwykle wysle szybciej niz minimum)
    const formLoadedAtField = formElement.querySelector(
        '[name="form_loaded_at_timestamp"]'
    );
    if (formLoadedAtField) {
        formLoadedAtField.value = String(Math.floor(Date.now() / 1000));
    }

    const submitButtonElement = formElement.querySelector('[type="submit"]');
    const statusElement = formElement.querySelector(".askee-contact-form__status");
    const fieldElementsByNameMap = {
        name: formElement.querySelector('[name="name"]'),
        email: formElement.querySelector('[name="email"]'),
        phone: formElement.querySelector('[name="phone"]'),
        message: formElement.querySelector('[name="message"]'),
        consent: formElement.querySelector('[name="consent"]'),
    };

    let isSendingBoolean = false;
    let abortControllerInstance = null;
    let nonceRefreshPromiseInstance = null;

    function setFieldErrorMessage(fieldNameString, errorMessageString) {
        const fieldElement = fieldElementsByNameMap[fieldNameString];
        if (!fieldElement) {
            return;
        }

        const wrapperElement = fieldElement.closest(".askee-contact-form__field");
        if (!wrapperElement) {
            return;
        }

        let errorElement = wrapperElement.querySelector(".askee-contact-form__error");
        if (!errorElement) {
            errorElement = document.createElement("span");
            errorElement.className = "askee-contact-form__error";
            wrapperElement.appendChild(errorElement);
        }

        if (typeof errorMessageString === "string" && errorMessageString !== "") {
            wrapperElement.classList.add("askee-contact-form__field--has-error");
            errorElement.textContent = errorMessageString;
            return;
        }

        wrapperElement.classList.remove("askee-contact-form__field--has-error");
        errorElement.textContent = "";
    }

    function clearAllFieldErrorMessages() {
        const wrappersArray = formElement.querySelectorAll(".askee-contact-form__field");
        for (let index = 0; index < wrappersArray.length; index += 1) {
            const wrapperElement = wrappersArray[index];
            wrapperElement.classList.remove("askee-contact-form__field--has-error");
            const errorElement = wrapperElement.querySelector(".askee-contact-form__error");
            if (errorElement) {
                errorElement.textContent = "";
            }
        }
    }

    function setFormStatusMessage(statusVariantString, messageString) {
        if (!statusElement) {
            return;
        }

        statusElement.classList.remove(
            "askee-contact-form__status--success",
            "askee-contact-form__status--error",
            "askee-contact-form__status--info"
        );

        if (typeof messageString !== "string" || messageString === "") {
            statusElement.textContent = "";
            statusElement.removeAttribute("role");
            return;
        }

        if (statusVariantString === "success") {
            statusElement.classList.add("askee-contact-form__status--success");
        } else if (statusVariantString === "error") {
            statusElement.classList.add("askee-contact-form__status--error");
        } else {
            statusElement.classList.add("askee-contact-form__status--info");
        }

        statusElement.textContent = messageString;
        statusElement.setAttribute("role", "status");
    }

    function setSubmitButtonBusy(isBusyBoolean) {
        if (!submitButtonElement) {
            return;
        }

        if (isBusyBoolean) {
            submitButtonElement.setAttribute("disabled", "disabled");
            submitButtonElement.classList.add("askee-contact-form__submit--busy");
            return;
        }

        submitButtonElement.removeAttribute("disabled");
        submitButtonElement.classList.remove("askee-contact-form__submit--busy");
    }

    // odswieza nonce (np. po dlugim siedzeniu na cachowanej stronie)
    async function refreshNonceFromServerOnce() {
        if (!nonceRefreshUrlString) {
            return false;
        }

        if (nonceRefreshPromiseInstance) {
            return nonceRefreshPromiseInstance;
        }

        nonceRefreshPromiseInstance = (async function () {
            const separatorString = nonceRefreshUrlString.includes("?") ? "&" : "?";
            const requestUrlString =
                nonceRefreshUrlString +
                separatorString +
                "askee_nonce_refresh=" +
                Date.now();

            const responseObject = await fetch(requestUrlString, {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                },
            });

            const responseJsonObject = await responseObject.json().catch(function () {
                return null;
            });

            if (
                responseObject.ok &&
                responseJsonObject &&
                typeof responseJsonObject.nonce === "string" &&
                responseJsonObject.nonce.trim() !== ""
            ) {
                currentNonceString = responseJsonObject.nonce.trim();
                if (window.AskeeContactConfig && typeof window.AskeeContactConfig === "object") {
                    window.AskeeContactConfig.nonce = currentNonceString;
                }
                return true;
            }

            return false;
        })()
            .catch(function () {
                return false;
            })
            .finally(function () {
                nonceRefreshPromiseInstance = null;
            });

        return nonceRefreshPromiseInstance;
    }

    // wlasciwa wysylka POST z auto-retry przy nieaktualnym nonce
    async function postContactFormPayload(payloadObject, optionsObject) {
        const safeOptionsObject =
            optionsObject && typeof optionsObject === "object" ? optionsObject : {};
        const shouldRetryNonceBoolean =
            typeof safeOptionsObject.shouldRetryNonce === "boolean"
                ? safeOptionsObject.shouldRetryNonce
                : true;

        await refreshNonceFromServerOnce();

        abortControllerInstance = new AbortController();

        const requestHeadersObject = {
            "Content-Type": "application/json",
        };
        if (currentNonceString) {
            requestHeadersObject["X-WP-Nonce"] = currentNonceString;
        }

        const responseObject = await fetch(restUrlString, {
            method: "POST",
            credentials: "same-origin",
            headers: requestHeadersObject,
            body: JSON.stringify(payloadObject),
            signal: abortControllerInstance.signal,
        });

        const responseBodyTextString = await responseObject.text();
        let parsedResponseObject = null;
        if (responseBodyTextString) {
            try {
                parsedResponseObject = JSON.parse(responseBodyTextString);
            } catch (error) {
                parsedResponseObject = null;
            }
        }

        const shouldRefreshNonceAndRetryBoolean =
            shouldRetryNonceBoolean &&
            responseObject.status === 403 &&
            parsedResponseObject &&
            typeof parsedResponseObject === "object" &&
            (parsedResponseObject.code === "rest_cookie_invalid_nonce" ||
                parsedResponseObject.error === "invalid_nonce");

        if (shouldRefreshNonceAndRetryBoolean) {
            const refreshedSuccessfullyBoolean = await refreshNonceFromServerOnce();
            if (refreshedSuccessfullyBoolean) {
                return postContactFormPayload(payloadObject, { shouldRetryNonce: false });
            }
        }

        return {
            httpStatusNumber: responseObject.status,
            payloadObject: parsedResponseObject,
        };
    }

    function buildPayloadFromFormState() {
        const formDataObject = new FormData(formElement);

        const honeypotFieldElement = formElement.querySelector(
            '[name="' + honeypotFieldNameString + '"]'
        );
        const honeypotValueString = honeypotFieldElement
            ? String(honeypotFieldElement.value || "")
            : "";

        const consentFieldElement = fieldElementsByNameMap.consent;
        const consentCheckedBoolean =
            consentFieldElement && consentFieldElement.checked === true;

        const payloadObject = {
            name: String(formDataObject.get("name") || "").trim(),
            email: String(formDataObject.get("email") || "").trim(),
            phone: String(formDataObject.get("phone") || "").trim(),
            message: String(formDataObject.get("message") || "").trim(),
            consent: consentCheckedBoolean ? "1" : "0",
            form_loaded_at_timestamp: String(formDataObject.get("form_loaded_at_timestamp") || ""),
        };

        payloadObject[honeypotFieldNameString] = honeypotValueString;

        return payloadObject;
    }

    async function onFormSubmit(eventObject) {
        if (eventObject) {
            eventObject.preventDefault();
        }

        if (isSendingBoolean) {
            return;
        }

        clearAllFieldErrorMessages();
        setFormStatusMessage("info", "");

        const payloadObject = buildPayloadFromFormState();

        // krotka walidacja po stronie klienta (twardziej waliduje serwer)
        const clientSideErrorsObject = {};
        if (!payloadObject.name || payloadObject.name.length < 2) {
            clientSideErrorsObject.name = "Podaj imię i nazwisko (min. 2 znaki).";
        }
        if (!payloadObject.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payloadObject.email)) {
            clientSideErrorsObject.email = "Podaj poprawny adres e-mail.";
        }
        if (!payloadObject.phone || payloadObject.phone.replace(/[^0-9]/g, "").length < 7) {
            clientSideErrorsObject.phone = "Podaj poprawny numer telefonu.";
        }
        if (!payloadObject.message || payloadObject.message.length < 10) {
            clientSideErrorsObject.message = "Wiadomość jest za krótka (min. 10 znaków).";
        }
        if (payloadObject.consent !== "1") {
            clientSideErrorsObject.consent =
                "Wymagana jest zgoda na przetwarzanie danych zgodnie z polityką prywatności.";
        }

        const clientSideErrorKeysArray = Object.keys(clientSideErrorsObject);
        if (clientSideErrorKeysArray.length > 0) {
            for (let index = 0; index < clientSideErrorKeysArray.length; index += 1) {
                const fieldNameString = clientSideErrorKeysArray[index];
                setFieldErrorMessage(fieldNameString, clientSideErrorsObject[fieldNameString]);
            }
            setFormStatusMessage("error", "Sprawdź zaznaczone pola i spróbuj ponownie.");
            return;
        }

        isSendingBoolean = true;
        setSubmitButtonBusy(true);
        setFormStatusMessage("info", "Wysyłanie wiadomości…");

        try {
            const responseStateObject = await postContactFormPayload(payloadObject, {
                shouldRetryNonce: true,
            });

            const httpStatusNumber = responseStateObject.httpStatusNumber;
            const responsePayloadObject = responseStateObject.payloadObject;

            if (httpStatusNumber === 200 && responsePayloadObject && responsePayloadObject.ok) {
                const successMessageString =
                    typeof responsePayloadObject.message === "string"
                        ? responsePayloadObject.message
                        : "Dziękujemy! Wiadomość została wysłana — odezwiemy się wkrótce.";

                formElement.reset();
                if (formLoadedAtField) {
                    formLoadedAtField.value = String(Math.floor(Date.now() / 1000));
                }
                setFormStatusMessage("success", successMessageString);
                return;
            }

            if (httpStatusNumber === 422 && responsePayloadObject) {
                const fieldsObject =
                    responsePayloadObject.fields && typeof responsePayloadObject.fields === "object"
                        ? responsePayloadObject.fields
                        : {};
                const serverFieldKeysArray = Object.keys(fieldsObject);
                for (let index = 0; index < serverFieldKeysArray.length; index += 1) {
                    const fieldNameString = serverFieldKeysArray[index];
                    setFieldErrorMessage(fieldNameString, fieldsObject[fieldNameString]);
                }
                setFormStatusMessage("error", "Sprawdź zaznaczone pola i spróbuj ponownie.");
                return;
            }

            if (httpStatusNumber === 429 && responsePayloadObject) {
                const minutesLeftNumber = Number(responsePayloadObject.minutes_left) || 0;
                const rateLimitedMessageString =
                    typeof responsePayloadObject.message === "string"
                        ? responsePayloadObject.message
                        : minutesLeftNumber > 0
                          ? "Przekroczono limit wiadomości. Spróbuj ponownie za " +
                            minutesLeftNumber +
                            " min."
                          : "Przekroczono limit wiadomości. Spróbuj ponownie później.";
                setFormStatusMessage("error", rateLimitedMessageString);
                return;
            }

            const fallbackErrorMessageString =
                responsePayloadObject &&
                typeof responsePayloadObject.message === "string" &&
                responsePayloadObject.message !== ""
                    ? responsePayloadObject.message
                    : "Nie udało się wysłać wiadomości. Spróbuj ponownie później.";
            setFormStatusMessage("error", fallbackErrorMessageString);
        } catch (error) {
            if (error && error.name === "AbortError") {
                return;
            }
            setFormStatusMessage("error", "Błąd połączenia. Spróbuj ponownie za chwilę.");
        } finally {
            isSendingBoolean = false;
            setSubmitButtonBusy(false);
            abortControllerInstance = null;
        }
    }

    function onFieldInput(eventObject) {
        const fieldElement = eventObject && eventObject.target;
        if (!(fieldElement instanceof Element)) {
            return;
        }

        const wrapperElement = fieldElement.closest(".askee-contact-form__field");
        if (!wrapperElement) {
            return;
        }

        if (wrapperElement.classList.contains("askee-contact-form__field--has-error")) {
            wrapperElement.classList.remove("askee-contact-form__field--has-error");
            const errorElement = wrapperElement.querySelector(".askee-contact-form__error");
            if (errorElement) {
                errorElement.textContent = "";
            }
        }
    }

    formElement.addEventListener("submit", onFormSubmit);
    formElement.addEventListener("input", onFieldInput);
    formElement.addEventListener("change", onFieldInput);

    return function cleanupSingleAskeeContactForm() {
        formElement.removeEventListener("submit", onFormSubmit);
        formElement.removeEventListener("input", onFieldInput);
        formElement.removeEventListener("change", onFieldInput);
        if (abortControllerInstance) {
            try {
                abortControllerInstance.abort();
            } catch (error) {}
            abortControllerInstance = null;
        }
        delete formElement.dataset.askeeContactFormInitialized;
    };
}
