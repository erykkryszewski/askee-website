import $ from "jquery";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

document.addEventListener("DOMContentLoaded", function () {
    let header = document.querySelector(".header");
    let footer = document.querySelector(".footer");
    let main = document.querySelector("main#main");
    let body = document.body;

    let headerHeight = header.offsetHeight;
    let footerHeight = footer.offsetHeight + 60;
    let footerHeightWithAdminBar = footer.offsetHeight + 60 + 32;

    if (body.classList.contains("admin-bar")) {
        main.style.minHeight = "calc(100vh - " + footerHeightWithAdminBar + "px)";
        main.style.paddingTop = headerHeight + "px";
    } else {
        main.style.minHeight = "calc(100vh - " + footerHeight + "px)";
        main.style.paddingTop = headerHeight + "px";
    }

    // mega giga global animations
    gsap.registerPlugin(ScrollTrigger);

    const sections = document.querySelectorAll(
        "main#main > div:not(.default-block):not(.subpage-hero):not(.map):not(.services):not(.specialist)"
    );

    const viewportHeight = window.innerHeight;
    let initialBatchIndex = 0;

    // sections.forEach(function (sectionElement) {
    //     const rect = sectionElement.getBoundingClientRect();
    //     const isInitialVisible = rect.top < viewportHeight * 0.9;
    //     let delayValue = 0;
    //     if (isInitialVisible) {
    //         delayValue = initialBatchIndex * 0.13;
    //         initialBatchIndex = initialBatchIndex + 1;
    //     }

    //     gsap.from(sectionElement, {
    //         y: 20,
    //         autoAlpha: 0,
    //         duration: 0.45,
    //         ease: "power2.out",
    //         delay: delayValue,
    //         scrollTrigger: {
    //             trigger: sectionElement,
    //             start: "top 90%",
    //             toggleActions: "play none none none",
    //         },
    //     });
    // });
});
