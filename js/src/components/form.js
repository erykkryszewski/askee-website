document.addEventListener("DOMContentLoaded", function () {
    const askeeForm = document.querySelector(".askee-form");
    if (!askeeForm) return;
    const askeeFormName = document.querySelector(".askee-form-name");
    const askeeFormSurname = document.querySelector(".askee-form-surname");
    const askeeFormEmail = document.querySelector(".askee-form-email");
    const askeeFormPhone = document.querySelector(".askee-form-phone");
    const askeeFormTextarea = document.querySelector(".askee-form-textarea");
    const askeeFormAcceptance = document.querySelector(".askee-form-acceptance");
    const askeeFormSubmit = document.querySelector('input[type="submit"]');

    function askeeShowError(container, message) {
        if (!container) return;
        let errorEl = container.querySelector(".askee-error-message");
        if (!errorEl) {
            errorEl = document.createElement("div");
            errorEl.classList.add("askee-error-message");
            errorEl.style.color = "red";
            errorEl.style.fontSize = "13px";
            errorEl.style.marginTop = "3px";
            errorEl.style.position = "absolute";
            container.appendChild(errorEl);
        }
        errorEl.textContent = message;
    }

    function askeeRemoveError(container) {
        if (!container) return;
        const errorEl = container.querySelector(".askee-error-message");
        if (errorEl) errorEl.remove();
    }

    function askeeValidateName() {
        const input = askeeFormName.querySelector("input");
        input.value = input.value.replace(/[^A-Za-z\s]/g, "");
        const value = input.value.trim();
        if (value.length < 3) {
            askeeShowError(askeeFormName, "Imię nie może być krótsze niż 3 znaki.");
            return false;
        } else {
            askeeRemoveError(askeeFormName);
            return true;
        }
    }

    function askeeValidateSurname() {
        const input = askeeFormSurname.querySelector("input");
        input.value = input.value.replace(/[^A-Za-z\s]/g, "");
        const value = input.value.trim();
        if (value.length < 3) {
            askeeShowError(askeeFormSurname, "Nazwisko nie może być krótsze niż 3 znaki.");
            return false;
        } else {
            askeeRemoveError(askeeFormSurname);
            return true;
        }
    }

    function askeeValidateEmail() {
        if (!askeeFormEmail) return true;
        const input = askeeFormEmail.querySelector("input");
        const value = input ? input.value.trim() : "";
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value.match(emailPattern)) {
            askeeShowError(askeeFormEmail, "Proszę wprowadzić prawidłowy adres email.");
            return false;
        } else {
            askeeRemoveError(askeeFormEmail);
            return true;
        }
    }

    function askeeValidatePhone() {
        if (!askeeFormPhone) return true;
        const input = askeeFormPhone.querySelector("input");
        const value = input ? input.value.trim() : "";
        if (!/^[+0-9\s]+$/.test(value) || value.replace(/\D/g, "").length < 9) {
            askeeShowError(askeeFormPhone, "Wprowadź prawidłowy numer telefonu.");
            return false;
        } else {
            askeeRemoveError(askeeFormPhone);
            return true;
        }
    }

    function askeeValidateTextarea() {
        if (!askeeFormTextarea) return true;
        const textarea = askeeFormTextarea.querySelector("textarea");
        const value = textarea ? textarea.value.trim() : "";
        if (value.length < 15) {
            askeeShowError(askeeFormTextarea, "Wiadomość powinna mieć co najmniej 15 znaków.");
            return false;
        } else {
            askeeRemoveError(askeeFormTextarea);
            return true;
        }
    }

    function askeeValidateAcceptance() {
        if (!askeeFormAcceptance) return true;
        const checkbox = askeeFormAcceptance.querySelector('input[type="checkbox"]');
        if (!checkbox.checked) {
            askeeShowError(askeeFormAcceptance, "Musisz wyrazić zgodę, aby kontynuować.");
            return false;
        } else {
            askeeRemoveError(askeeFormAcceptance);
            return true;
        }
    }

    function askeeValidateAllFields() {
        let valid = true;
        valid = askeeValidateName() && valid;
        valid = askeeValidateSurname() && valid;
        valid = askeeValidateEmail() && valid;
        valid = askeeValidatePhone() && valid;
        valid = askeeValidateTextarea() && valid;
        valid = askeeValidateAcceptance() && valid;
        return valid;
    }

    if (askeeFormName) {
        askeeFormName.querySelector("input").addEventListener("input", askeeValidateName);
    }

    if (askeeFormSurname) {
        askeeFormSurname.querySelector("input").addEventListener("input", askeeValidateSurname);
    }

    if (askeeFormEmail) {
        askeeFormEmail.querySelector("input").addEventListener("input", askeeValidateEmail);
    }

    if (askeeFormPhone) {
        askeeFormPhone.querySelector("input").addEventListener("input", askeeValidatePhone);
    }

    if (askeeFormTextarea) {
        askeeFormTextarea
            .querySelector("textarea")
            .addEventListener("input", askeeValidateTextarea);
    }

    if (askeeFormAcceptance) {
        askeeFormAcceptance
            .querySelector('input[type="checkbox"]')
            .addEventListener("change", askeeValidateAcceptance);
    }

    if (askeeFormSubmit) {
        askeeFormSubmit.addEventListener("mouseenter", function () {
            askeeValidateAllFields();
        });
    }

    askeeForm.addEventListener("submit", function () {
        askeeValidateAllFields();
    });
});
