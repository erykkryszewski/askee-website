let spacers = document.querySelectorAll(".spacer");

document.addEventListener("DOMContentLoaded", function () {
    spacers.forEach(function (singleSpacer) {
        let spacerContainer = singleSpacer.parentElement;
        spacerContainer.classList.add("container-fluid");
        spacerContainer.classList.remove("container");
    });
});
