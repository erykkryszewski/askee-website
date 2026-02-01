import { bootAskeeBlocks, cleanupAskeeBlocks } from "./boot";

export function initAskeeSpaHooks() {
    function bootFromMain() {
        const mainElement = document.querySelector("#askee-app-content");
        if (!mainElement) {
            bootAskeeBlocks(document);
            return;
        }
        bootAskeeBlocks(mainElement);
    }

    function cleanupBeforeSwap() {
        cleanupAskeeBlocks();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootFromMain);
    } else {
        bootFromMain();
    }

    window.addEventListener("askee:navigation:before", cleanupBeforeSwap);
    window.addEventListener("askee:navigation:complete", bootFromMain);
}
