import { bootAskeeBlocks } from "./boot";

export function initAskeeSpaHooks() {
    function bootFromMain() {
        const mainElement = document.querySelector("#askee-app-content");
        if (!mainElement) {
            bootAskeeBlocks(document);
            return;
        }
        bootAskeeBlocks(mainElement);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootFromMain);
    } else {
        bootFromMain();
    }

    window.addEventListener("askee:navigation:complete", function () {
        bootFromMain();
    });
}
