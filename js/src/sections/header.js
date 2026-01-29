import $ from "jquery";

window.addEventListener("scroll", function () {
    if (window.scrollY >= 50) {
        document.querySelector(".header").classList.add("header--fixed");
        document.querySelector(".nav").classList.add("nav--fixed");
        document.querySelector(".nav__logo").classList.add("nav__logo--fixed");
        document.querySelector(".nav__menu").classList.add("nav__menu--fixed");
        document.querySelector(".nav__button").classList.add("nav__button--fixed");
        document.querySelector(".nav__hamburger").classList.add("nav__hamburger--fixed");
    } else {
        document.querySelector(".header").classList.remove("header--fixed");
        document.querySelector(".nav").classList.remove("nav--fixed");
        document.querySelector(".nav__logo").classList.remove("nav__logo--fixed");
        document.querySelector(".nav__menu").classList.remove("nav__menu--fixed");
        document.querySelector(".nav__button").classList.remove("nav__button--fixed");
        document.querySelector(".nav__hamburger").classList.remove("nav__hamburger--fixed");
    }
});

$("document").ready(function () {
    let isAnimating = false;

    function resetNavForDesktop() {
        if ($(window).width() > 1199) {
            $(".nav__menu, .menu-item-has-children > ul").removeAttr("style");
            $(".hamburger").removeClass("active");
            $(".header").removeClass("header--open");
            $(".nav").removeClass("nav--open");
            $(".nav__menu").removeClass("nav__menu--open");
            $(".nav .sub-menu").removeClass("sub-menu--open");
            $(".nav__button").removeClass("nav__button--open");
            $(".nav__hamburger").removeClass("nav__hamburger--open");
            $("body").removeClass("overflow-hidden");
        }
    }

    $(".hamburger").on("click", function () {
        if (isAnimating) return;
        isAnimating = true;

        $(this).toggleClass("active");
        $(".header").toggleClass("header--open");
        $(".nav").toggleClass("nav--open");
        $(".nav__menu").toggleClass("nav__menu--open");
        $(".nav .sub-menu").toggleClass("sub-menu--open");
        $(".nav__button").toggleClass("nav__button--open");
        $(".nav__hamburger").toggleClass("nav__hamburger--open");
        $("body").toggleClass("overflow-hidden");

        // Animate menu with callback to unlock animation
        $(".nav__menu")
            .stop(true, true)
            .slideToggle(300, function () {
                isAnimating = false;
            });
    });

    $(".menu-item-has-children > a").on("click", function (e) {
        e.preventDefault();

        if (window.matchMedia("(max-width: 1199px)").matches) {
            const $submenu = $(this).siblings("ul");
            if ($submenu.length) {
                $submenu.stop(true, true).slideToggle();
            }
        }
    });

    $(".nav__menu li > a").on("click", function () {
        const $parent = $(this).parent();

        if (
            window.matchMedia("(max-width: 1199px)").matches &&
            !$parent.hasClass("menu-item-has-children")
        ) {
            $(".nav__menu").stop(true, true).slideUp();
            $(".menu-item-has-children > ul").stop(true, true).slideUp();
            $(".hamburger").removeClass("active");
            $(".header").removeClass("header--open");
            $(".nav").removeClass("nav--open");
            $(".nav__menu").removeClass("nav__menu--open");
            $(".nav .sub-menu").removeClass("sub-menu--open");
            $(".nav__button").removeClass("nav__button--open");
            $(".nav__hamburger").removeClass("nav__hamburger--open");
            $("body").removeClass("overflow-hidden");
        }
    });

    // Fix anchor hrefs for subpages
    if ($("body").hasClass("theme-subpage")) {
        $(".nav__menu > li a").each(function () {
            let currentHref = $(this).attr("href");
            if (currentHref && currentHref.charAt(0) === "#") {
                $(this).attr("href", "/" + currentHref);
            }
        });
    }

    // Reset navigation styles on window resize
    $(window).on("resize", function () {
        resetNavForDesktop();
    });

    // Optional: reset on orientation change (for mobile devices)
    $(window).on("orientationchange", function () {
        resetNavForDesktop();
    });
});
