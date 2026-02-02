import $ from "jquery";
import "slick-carousel";

export function initAskeeHomePage(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;
    const homePageContainer = safeRootElement.querySelector('[data-askee-page="home"]');

    if (!homePageContainer) {
        return null;
    }

    if (homePageContainer.dataset.askeePageInitialized === "1") {
        return null;
    }
    homePageContainer.dataset.askeePageInitialized = "1";

    const initializedSlidersArray = [];

    const homepageSliders = homePageContainer.querySelectorAll(".askee-homepage__slider");

    homepageSliders.forEach((singleSlider) => {
        const jquerySliderInstance = $(singleSlider);

        if (jquerySliderInstance.hasClass("slick-initialized")) {
            return;
        }

        singleSlider.classList.add("askee-homepage__slider--pending");

        jquerySliderInstance.one("init", () => {
            singleSlider.classList.remove("askee-homepage__slider--pending");
        });

        const slickConfiguration = {
            infinite: true,
            slidesToShow: 1,
            slidesToScroll: 1,
            dots: true,
            arrows: false,
            autoplay: false,
            autoplaySpeed: 4000,
            fade: true,
            cssEase: "linear",
        };

        jquerySliderInstance.slick(slickConfiguration);
        initializedSlidersArray.push(singleSlider);
    });

    return function cleanupAskeeHomePage() {
        for (let index = 0; index < initializedSlidersArray.length; index += 1) {
            const sliderElement = initializedSlidersArray[index];
            try {
                const jquerySliderInstance = $(sliderElement);
                if (jquerySliderInstance.hasClass("slick-initialized")) {
                    jquerySliderInstance.slick("unslick");
                }
                sliderElement.classList.remove("askee-homepage__slider--pending");
            } catch (error) {}
        }
    };
}
