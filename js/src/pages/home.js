import $ from "jquery";
import "slick-carousel";

export function initAskeeHomePage(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;
    const homePageContainer = safeRootElement.querySelector('[data-askee-page="home"]');

    if (!homePageContainer) {
        return;
    }

    if (homePageContainer.dataset.askeeInitialized === "1") {
        return;
    }

    homePageContainer.dataset.askeeInitialized = "1";

    const homepageSliders = homePageContainer.querySelectorAll(".askee-homepage__slider");

    homepageSliders.forEach((singleSlider) => {
        if (singleSlider.dataset.askeeSlickInitialized === "1") {
            return;
        }

        const jquerySliderInstance = $(singleSlider);

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

        singleSlider.dataset.askeeSlickInitialized = "1";
    });
}
