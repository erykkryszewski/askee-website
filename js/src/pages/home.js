import $ from "jquery";
import "slick-carousel";

export function initAskeeHomePage(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;
    const homePageContainer = safeRootElement.querySelector('[data-askee-page="home"]');

    if (!homePageContainer) {
        return null;
    }

    const initializedSlidersArray = [];

    const homepageSliders = homePageContainer.querySelectorAll(".askee-homepage__slider");

    homepageSliders.forEach((singleSlider) => {
        const jquerySliderInstance = $(singleSlider);

        if (jquerySliderInstance.hasClass("slick-initialized")) {
            return;
        }

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
            } catch (error) {}
        }
    };
}
