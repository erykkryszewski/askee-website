document.addEventListener("DOMContentLoaded", function () {
    const popup = document.querySelector(".popup--promotion");

    if (!popup) return;

    const closeButton = document.getElementById("popup-close-promotion");
    const ctaButton = popup.querySelector(".popup__button");
    const wrapper = popup.querySelector(".popup__wrapper--promotion");

    if (!closeButton || !ctaButton) return;

    if (sessionStorage.getItem("promotionPopupDismissed") === "true") {
        return;
    }

    function showPopup() {
        popup.style.display = "flex";
        setTimeout(() => {
            popup.style.opacity = "1";

            setTimeout(() => {
                popup.addEventListener("click", hidePopup);
            }, 2000);
        }, 10);
    }

    function hidePopup() {
        popup.style.opacity = "0";
        setTimeout(() => {
            popup.style.display = "none";
        }, 300);
        sessionStorage.setItem("promotionPopupDismissed", "true");
    }

    popup.style.opacity = "0";
    popup.style.transition = "opacity 0.3s ease-in-out";

    setTimeout(showPopup, 3000);

    closeButton.addEventListener("click", function (e) {
        e.preventDefault();
        hidePopup();
    });

    ctaButton.addEventListener("click", function () {
        hidePopup();
    });

    if (wrapper) {
        wrapper.addEventListener("click", function (e) {
            e.stopPropagation();
        });
    }
});
