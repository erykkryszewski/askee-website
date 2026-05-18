// inicjalizuje wszystkie formularze ticketowe na stronie i podpina ich logike
export function initAskeeTicketFormSection(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;

    const formElementsArray = Array.from(
        safeRootElement.querySelectorAll(".askee-ticket-form")
    );

    if (formElementsArray.length === 0) {
        return null;
    }

    const cleanupFunctionsArray = [];

    for (let formIndexNumber = 0; formIndexNumber < formElementsArray.length; formIndexNumber += 1) {
        const formElement = formElementsArray[formIndexNumber];
        const cleanupFunction = initSingleAskeeTicketForm(formElement);
        if (typeof cleanupFunction === "function") {
            cleanupFunctionsArray.push(cleanupFunction);
        }
    }

    if (cleanupFunctionsArray.length === 0) {
        return null;
    }

    return function cleanupAskeeTicketFormSection() {
        for (let index = 0; index < cleanupFunctionsArray.length; index += 1) {
            try {
                cleanupFunctionsArray[index]();
            } catch (error) {}
        }
    };
}

// pojedyncza instancja formularza ticketowego
function initSingleAskeeTicketForm(formElement) {
    if (!(formElement instanceof HTMLElement)) {
        return null;
    }

    if (formElement.dataset.askeeTicketFormInitialized === "1") {
        return null;
    }
    formElement.dataset.askeeTicketFormInitialized = "1";

    const ticketConfigObject = window.AskeeTicketConfig || {};
    const restUrlString =
        typeof ticketConfigObject.restUrl === "string" ? ticketConfigObject.restUrl : "";
    const nonceRefreshUrlString =
        typeof ticketConfigObject.nonceRefreshUrl === "string"
            ? ticketConfigObject.nonceRefreshUrl
            : "";
    const honeypotFieldNameString =
        typeof ticketConfigObject.honeypotFieldName === "string" &&
        ticketConfigObject.honeypotFieldName !== ""
            ? ticketConfigObject.honeypotFieldName
            : "askee_website_url";

    const categoriesMapObject =
        ticketConfigObject.categoriesMap && typeof ticketConfigObject.categoriesMap === "object"
            ? ticketConfigObject.categoriesMap
            : {};
    const attachmentMaxCountNumber = Number(ticketConfigObject.attachmentMaxCount) || 3;
    const attachmentMaxBytesPerFileNumber = Number(ticketConfigObject.attachmentMaxBytesPerFile) || 5242880;
    const attachmentAllowedExtensionsArray =
        Array.isArray(ticketConfigObject.attachmentAllowedExtensions) &&
        ticketConfigObject.attachmentAllowedExtensions.length > 0
            ? ticketConfigObject.attachmentAllowedExtensions.map(function (extension) {
                  return String(extension || "").toLowerCase();
              })
            : ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "txt"];
    const ticketNumberRegexSource =
        typeof ticketConfigObject.ticketNumberRegex === "string" && ticketConfigObject.ticketNumberRegex !== ""
            ? ticketConfigObject.ticketNumberRegex
            : "^ASK-\\d{4}-\\d{4,}$";
    const ticketNumberRegex = new RegExp(ticketNumberRegexSource, "i");

    let currentNonceString =
        typeof ticketConfigObject.nonce === "string" ? ticketConfigObject.nonce : "";

    // wstawiamy timestamp zaladowania formularza (bot zwykle wyslie szybciej niz minimum)
    const formLoadedAtField = formElement.querySelector('[name="form_loaded_at_timestamp"]');
    if (formLoadedAtField) {
        formLoadedAtField.value = String(Math.floor(Date.now() / 1000));
    }

    const submitButtonElement = formElement.querySelector('[type="submit"]');
    const statusElement = formElement.querySelector(".askee-ticket-form__status");
    const fileInputElement = formElement.querySelector('.askee-ticket-form__file-input');
    const fileListElement = formElement.querySelector(".askee-ticket-form__file-list");

    const fieldElementsByNameMap = {
        name: formElement.querySelector('[name="name"]'),
        email: formElement.querySelector('[name="email"]'),
        phone: formElement.querySelector('[name="phone"]'),
        company: formElement.querySelector('[name="company"]'),
        position: formElement.querySelector('[name="position"]'),
        category: formElement.querySelector('[name="category"]'),
        previous_ticket_number: formElement.querySelector('[name="previous_ticket_number"]'),
        message: formElement.querySelector('[name="message"]'),
        attachments: fileInputElement,
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

        const wrapperElement = fieldElement.closest(".askee-ticket-form__field");
        if (!wrapperElement) {
            return;
        }

        let errorElement = wrapperElement.querySelector(".askee-ticket-form__error");
        if (!errorElement) {
            errorElement = document.createElement("span");
            errorElement.className = "askee-ticket-form__error";
            wrapperElement.appendChild(errorElement);
        }

        if (typeof errorMessageString === "string" && errorMessageString !== "") {
            wrapperElement.classList.add("askee-ticket-form__field--has-error");
            errorElement.textContent = errorMessageString;
            return;
        }

        wrapperElement.classList.remove("askee-ticket-form__field--has-error");
        errorElement.textContent = "";
    }

    function clearAllFieldErrorMessages() {
        const wrappersArray = formElement.querySelectorAll(".askee-ticket-form__field");
        for (let index = 0; index < wrappersArray.length; index += 1) {
            const wrapperElement = wrappersArray[index];
            wrapperElement.classList.remove("askee-ticket-form__field--has-error");
            const errorElement = wrapperElement.querySelector(".askee-ticket-form__error");
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
            "askee-ticket-form__status--success",
            "askee-ticket-form__status--error",
            "askee-ticket-form__status--info"
        );

        if (typeof messageString !== "string" || messageString === "") {
            statusElement.textContent = "";
            statusElement.removeAttribute("role");
            return;
        }

        if (statusVariantString === "success") {
            statusElement.classList.add("askee-ticket-form__status--success");
        } else if (statusVariantString === "error") {
            statusElement.classList.add("askee-ticket-form__status--error");
        } else {
            statusElement.classList.add("askee-ticket-form__status--info");
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
            submitButtonElement.classList.add("askee-ticket-form__submit--busy");
            return;
        }

        submitButtonElement.removeAttribute("disabled");
        submitButtonElement.classList.remove("askee-ticket-form__submit--busy");
    }

    // usuwa pojedynczy plik z wyboru — przebudowujemy FileList przez DataTransfer
    // (FileList jest read-only, nie da sie z niej usunac elementu inaczej)
    function removeSelectedFileAtIndex(indexToRemoveNumber) {
        if (!fileInputElement || !fileInputElement.files) {
            return;
        }

        // starsze przegladarki bez DataTransfer — fallback: czyscimy caly wybor
        if (typeof DataTransfer === "undefined") {
            fileInputElement.value = "";
            refreshFileListDisplay();
            setFieldErrorMessage("attachments", "");
            return;
        }

        const currentFilesList = fileInputElement.files;
        const dataTransferInstance = new DataTransfer();
        for (let fileIndex = 0; fileIndex < currentFilesList.length; fileIndex += 1) {
            if (fileIndex === indexToRemoveNumber) {
                continue;
            }
            dataTransferInstance.items.add(currentFilesList[fileIndex]);
        }

        fileInputElement.files = dataTransferInstance.files;
        refreshFileListDisplay();
        setFieldErrorMessage("attachments", "");
    }

    // odswiezenie listy plikow w UI po wyborze plikow (z przyciskiem usuwania)
    function refreshFileListDisplay() {
        if (!fileListElement) {
            return;
        }

        while (fileListElement.firstChild) {
            fileListElement.removeChild(fileListElement.firstChild);
        }

        const filesList = fileInputElement && fileInputElement.files ? fileInputElement.files : null;
        if (!filesList || filesList.length === 0) {
            return;
        }

        for (let index = 0; index < filesList.length; index += 1) {
            const fileEntry = filesList[index];
            const liElement = document.createElement("li");
            liElement.className = "askee-ticket-form__file-list-item";

            const sizeKB = Math.max(1, Math.round(fileEntry.size / 1024));

            const nameSpanElement = document.createElement("span");
            nameSpanElement.className = "askee-ticket-form__file-list-name";
            nameSpanElement.textContent = fileEntry.name + " (" + sizeKB + " KB)";

            const removeButtonElement = document.createElement("button");
            removeButtonElement.type = "button";
            removeButtonElement.className = "askee-ticket-form__file-remove";
            removeButtonElement.textContent = "Usuń";
            removeButtonElement.setAttribute(
                "aria-label",
                'Usuń plik "' + fileEntry.name + '"'
            );

            const fileIndexNumber = index;
            removeButtonElement.addEventListener("click", function () {
                removeSelectedFileAtIndex(fileIndexNumber);
            });

            liElement.appendChild(nameSpanElement);
            liElement.appendChild(removeButtonElement);
            fileListElement.appendChild(liElement);
        }
    }

    function onFileInputChange() {
        refreshFileListDisplay();
    }

    // odswiezenie nonce z serwera (dla cachowanych stron, gdzie nonce moze byc nieaktualny)
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
                nonceRefreshUrlString + separatorString + "askee_nonce_refresh=" + Date.now();

            const responseObject = await fetch(requestUrlString, {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
                headers: { "Cache-Control": "no-cache" },
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
                if (window.AskeeTicketConfig && typeof window.AskeeTicketConfig === "object") {
                    window.AskeeTicketConfig.nonce = currentNonceString;
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

    // wlasciwa wysylka POST multipart (zalaczniki) z auto-retry przy nieaktualnym nonce
    async function postTicketFormPayload(formDataObject, optionsObject) {
        const safeOptionsObject =
            optionsObject && typeof optionsObject === "object" ? optionsObject : {};
        const shouldRetryNonceBoolean =
            typeof safeOptionsObject.shouldRetryNonce === "boolean"
                ? safeOptionsObject.shouldRetryNonce
                : true;

        await refreshNonceFromServerOnce();

        abortControllerInstance = new AbortController();

        // brak Content-Type - przegladarka sama ustawi multipart/form-data + boundary
        const requestHeadersObject = {};
        if (currentNonceString) {
            requestHeadersObject["X-WP-Nonce"] = currentNonceString;
        }

        const responseObject = await fetch(restUrlString, {
            method: "POST",
            credentials: "same-origin",
            headers: requestHeadersObject,
            body: formDataObject,
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
                return postTicketFormPayload(formDataObject, { shouldRetryNonce: false });
            }
        }

        return {
            httpStatusNumber: responseObject.status,
            payloadObject: parsedResponseObject,
        };
    }

    // pobiera wartosci pol z formularza i waliduje klientowo
    function validateClientSide() {
        const formDataObject = new FormData(formElement);

        const valuesObject = {
            name: String(formDataObject.get("name") || "").trim(),
            email: String(formDataObject.get("email") || "").trim(),
            phone: String(formDataObject.get("phone") || "").trim(),
            company: String(formDataObject.get("company") || "").trim(),
            position: String(formDataObject.get("position") || "").trim(),
            category: String(formDataObject.get("category") || "").trim(),
            previous_ticket_number: String(
                formDataObject.get("previous_ticket_number") || ""
            )
                .trim()
                .toUpperCase(),
            message: String(formDataObject.get("message") || "").trim(),
        };

        const consentElement = fieldElementsByNameMap.consent;
        const consentCheckedBoolean = consentElement && consentElement.checked === true;

        const errorsObject = {};

        if (!valuesObject.name || valuesObject.name.length < 2) {
            errorsObject.name = "Podaj imię i nazwisko (min. 2 znaki).";
        }

        if (!valuesObject.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valuesObject.email)) {
            errorsObject.email = "Podaj poprawny adres e-mail.";
        }

        // telefon opcjonalny — bledem tylko jak wpisane ale niepoprawne
        if (valuesObject.phone !== "" && valuesObject.phone.replace(/[^0-9]/g, "").length < 7) {
            errorsObject.phone = "Podaj poprawny numer telefonu lub zostaw pole puste.";
        }

        // nazwa firmy i stanowisko — wymagane
        if (!valuesObject.company || valuesObject.company.length < 2) {
            errorsObject.company = "Podaj nazwę firmy (min. 2 znaki).";
        } else if (valuesObject.company.length > 160) {
            errorsObject.company = "Nazwa firmy jest za długa (max 160 znaków).";
        }

        if (!valuesObject.position || valuesObject.position.length < 2) {
            errorsObject.position = "Podaj stanowisko (min. 2 znaki).";
        } else if (valuesObject.position.length > 120) {
            errorsObject.position = "Stanowisko jest za długie (max 120 znaków).";
        }

        if (!valuesObject.category || !Object.prototype.hasOwnProperty.call(categoriesMapObject, valuesObject.category)) {
            errorsObject.category = "Wybierz kategorię zgłoszenia.";
        }

        if (valuesObject.previous_ticket_number !== "") {
            if (!ticketNumberRegex.test(valuesObject.previous_ticket_number)) {
                errorsObject.previous_ticket_number =
                    "Numer poprzedniego zgłoszenia ma niepoprawny format (np. ASK-2026-0001).";
            }
        }

        if (!valuesObject.message || valuesObject.message.length < 10) {
            errorsObject.message = "Treść jest za krótka (min. 10 znaków).";
        } else if (valuesObject.message.length > 6000) {
            errorsObject.message = "Treść jest za długa (max 6000 znaków).";
        }

        // walidacja zalacznikow (liczba, rozmiar, rozszerzenie)
        const filesList = fileInputElement && fileInputElement.files ? fileInputElement.files : null;
        if (filesList && filesList.length > 0) {
            if (filesList.length > attachmentMaxCountNumber) {
                errorsObject.attachments =
                    "Możesz dodać maksymalnie " + attachmentMaxCountNumber + " załączników.";
            } else {
                for (let index = 0; index < filesList.length; index += 1) {
                    const fileEntry = filesList[index];
                    const fileNameLower = String(fileEntry.name || "").toLowerCase();
                    const dotIndex = fileNameLower.lastIndexOf(".");
                    const extensionString = dotIndex >= 0 ? fileNameLower.substring(dotIndex + 1) : "";

                    if (attachmentAllowedExtensionsArray.indexOf(extensionString) === -1) {
                        errorsObject.attachments =
                            'Niedozwolony typ pliku "' +
                            fileEntry.name +
                            '". Dozwolone: ' +
                            attachmentAllowedExtensionsArray.join(", ") +
                            ".";
                        break;
                    }

                    if (fileEntry.size > attachmentMaxBytesPerFileNumber) {
                        const maxMB = Math.round(attachmentMaxBytesPerFileNumber / 1024 / 1024);
                        errorsObject.attachments =
                            'Plik "' + fileEntry.name + '" jest za duży (max ' + maxMB + " MB).";
                        break;
                    }
                }
            }
        }

        if (!consentCheckedBoolean) {
            errorsObject.consent =
                "Wymagana jest zgoda na przetwarzanie danych zgodnie z polityką prywatności.";
        }

        return errorsObject;
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

        const clientErrorsObject = validateClientSide();
        const clientErrorKeysArray = Object.keys(clientErrorsObject);

        if (clientErrorKeysArray.length > 0) {
            for (let index = 0; index < clientErrorKeysArray.length; index += 1) {
                const fieldNameString = clientErrorKeysArray[index];
                setFieldErrorMessage(fieldNameString, clientErrorsObject[fieldNameString]);
            }
            setFormStatusMessage("error", "Sprawdź zaznaczone pola i spróbuj ponownie.");

            // skup focus na pierwszym polu z bledem
            const firstErrorFieldName = clientErrorKeysArray[0];
            const firstErrorFieldElement = fieldElementsByNameMap[firstErrorFieldName];
            if (firstErrorFieldElement && typeof firstErrorFieldElement.focus === "function") {
                try {
                    firstErrorFieldElement.focus({ preventScroll: false });
                } catch (focusError) {
                    firstErrorFieldElement.focus();
                }
            }
            return;
        }

        // wlasciwa wysylka — buduujemy FormData (zalaczniki) zamiast JSON
        const submissionFormData = new FormData(formElement);

        // upewniamy sie ze honeypot i consent maja prawidlowe wartosci w FormData
        // (FormData z <form> automatycznie zbiera, ale FormData NIE wysle checkboxa
        // ktory nie ma value="1" lub nie jest zaznaczony — sprawdzmy)
        const consentElement = fieldElementsByNameMap.consent;
        if (consentElement && consentElement.checked) {
            submissionFormData.set("consent", "1");
        } else {
            submissionFormData.set("consent", "0");
        }

        isSendingBoolean = true;
        setSubmitButtonBusy(true);
        setFormStatusMessage("info", "Wysyłanie zgłoszenia…");

        try {
            const responseStateObject = await postTicketFormPayload(submissionFormData, {
                shouldRetryNonce: true,
            });

            const httpStatusNumber = responseStateObject.httpStatusNumber;
            const responsePayloadObject = responseStateObject.payloadObject;

            if (httpStatusNumber === 200 && responsePayloadObject && responsePayloadObject.ok) {
                const ticketNumberString =
                    typeof responsePayloadObject.ticket_number === "string"
                        ? responsePayloadObject.ticket_number
                        : "";
                const successMessageString =
                    typeof responsePayloadObject.message === "string"
                        ? responsePayloadObject.message
                        : ticketNumberString
                          ? "Zgłoszenie zostało zapisane. Numer: " + ticketNumberString
                          : "Zgłoszenie zostało zapisane.";

                formElement.reset();
                if (formLoadedAtField) {
                    formLoadedAtField.value = String(Math.floor(Date.now() / 1000));
                }
                refreshFileListDisplay();
                setFormStatusMessage("success", successMessageString);

                // jak były bledy zalacznikow przy delivered_with_warnings, pokazujemy je usere
                if (
                    Array.isArray(responsePayloadObject.attachment_errors) &&
                    responsePayloadObject.attachment_errors.length > 0
                ) {
                    setFieldErrorMessage(
                        "attachments",
                        responsePayloadObject.attachment_errors.join(" ")
                    );
                }
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

                if (serverFieldKeysArray.length > 0) {
                    const firstServerErrorFieldElement = fieldElementsByNameMap[serverFieldKeysArray[0]];
                    if (
                        firstServerErrorFieldElement &&
                        typeof firstServerErrorFieldElement.focus === "function"
                    ) {
                        firstServerErrorFieldElement.focus();
                    }
                }
                return;
            }

            if (httpStatusNumber === 429 && responsePayloadObject) {
                const minutesLeftNumber = Number(responsePayloadObject.minutes_left) || 0;
                const rateLimitedMessageString =
                    typeof responsePayloadObject.message === "string"
                        ? responsePayloadObject.message
                        : minutesLeftNumber > 0
                          ? "Przekroczono limit zgłoszeń. Spróbuj ponownie za " +
                            minutesLeftNumber +
                            " min."
                          : "Przekroczono limit zgłoszeń. Spróbuj ponownie później.";
                setFormStatusMessage("error", rateLimitedMessageString);
                return;
            }

            const fallbackErrorMessageString =
                responsePayloadObject &&
                typeof responsePayloadObject.message === "string" &&
                responsePayloadObject.message !== ""
                    ? responsePayloadObject.message
                    : "Nie udało się wysłać zgłoszenia. Spróbuj ponownie później.";
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

        const wrapperElement = fieldElement.closest(".askee-ticket-form__field");
        if (!wrapperElement) {
            return;
        }

        if (wrapperElement.classList.contains("askee-ticket-form__field--has-error")) {
            wrapperElement.classList.remove("askee-ticket-form__field--has-error");
            const errorElement = wrapperElement.querySelector(".askee-ticket-form__error");
            if (errorElement) {
                errorElement.textContent = "";
            }
        }
    }

    formElement.addEventListener("submit", onFormSubmit);
    formElement.addEventListener("input", onFieldInput);
    formElement.addEventListener("change", onFieldInput);
    if (fileInputElement) {
        fileInputElement.addEventListener("change", onFileInputChange);
    }

    return function cleanupSingleAskeeTicketForm() {
        formElement.removeEventListener("submit", onFormSubmit);
        formElement.removeEventListener("input", onFieldInput);
        formElement.removeEventListener("change", onFieldInput);
        if (fileInputElement) {
            fileInputElement.removeEventListener("change", onFileInputChange);
        }
        if (abortControllerInstance) {
            try {
                abortControllerInstance.abort();
            } catch (error) {}
            abortControllerInstance = null;
        }
        delete formElement.dataset.askeeTicketFormInitialized;
    };
}
