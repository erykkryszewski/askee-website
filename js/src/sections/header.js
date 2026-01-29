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
