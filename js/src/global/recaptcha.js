document.addEventListener("DOMContentLoaded", function () {
    let formInputs = document.querySelectorAll(".gform_body input");

    formInputs.forEach(function (singleInput) {
        singleInput.addEventListener("focus", function () {
            let recaptchaScript = document.createElement("script");
            recaptchaScript.src =
                "https://www.google.com/recaptcha/api.js?hl=pl&render=explicit&ver=5.6.1";
            recaptchaScript.defer = true;
            document.body.appendChild(recaptchaScript);
        });
    });
});
