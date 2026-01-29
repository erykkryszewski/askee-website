document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".askeetheme-phone-number").forEach(function (askee_el) {
        let askee_phone_text = askee_el.textContent.replace(/\D+/g, "");

        if (askee_phone_text.startsWith("48") && askee_phone_text.length === 11) {
            askee_phone_text = `+${askee_phone_text}`;
        } else if (!askee_phone_text.startsWith("+48") && askee_phone_text.length === 9) {
            askee_phone_text = `+48${askee_phone_text}`;
        }

        let match = askee_phone_text.match(/^\+48(\d{3})(\d{3})(\d{3})$/);
        if (match) {
            let formatted = `+48 ${match[1]} ${match[2]} ${match[3]}`;
            askee_el.textContent = formatted;

            let parent_link = askee_el.closest("a[href^='tel:']");
            if (parent_link) {
                parent_link.setAttribute("href", "tel:" + formatted.replace(/\s+/g, ""));
            }
        }
    });
});
