export function initAskeePhoneNumberComponent(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;

    const itemsArray = safeRootElement.querySelectorAll(".askeetheme-phone-number");

    for (let index = 0; index < itemsArray.length; index += 1) {
        const askeeElement = itemsArray[index];

        if (askeeElement.dataset.askeePhoneInitialized === "1") {
            continue;
        }

        askeeElement.dataset.askeePhoneInitialized = "1";

        let askeePhoneText = askeeElement.textContent.replace(/\D+/g, "");

        if (askeePhoneText.startsWith("48") && askeePhoneText.length === 11) {
            askeePhoneText = `+${askeePhoneText}`;
        } else if (!askeePhoneText.startsWith("+48") && askeePhoneText.length === 9) {
            askeePhoneText = `+48${askeePhoneText}`;
        }

        const match = askeePhoneText.match(/^\+48(\d{3})(\d{3})(\d{3})$/);
        if (!match) {
            continue;
        }

        const formatted = `+48 ${match[1]} ${match[2]} ${match[3]}`;
        askeeElement.textContent = formatted;

        const parentLink = askeeElement.closest("a[href^='tel:']");
        if (parentLink) {
            parentLink.setAttribute("href", "tel:" + formatted.replace(/\s+/g, ""));
        }
    }
}
