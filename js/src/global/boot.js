const askeeBlocksArray = [];
let activeCleanupFunctionsArray = [];

export function registerAskeeBlock(initFunction) {
    if (typeof initFunction !== "function") {
        return;
    }
    askeeBlocksArray.push(initFunction);
}

export function cleanupAskeeBlocks() {
    for (let index = 0; index < activeCleanupFunctionsArray.length; index += 1) {
        const cleanupFunction = activeCleanupFunctionsArray[index];
        try {
            cleanupFunction();
        } catch (error) {}
    }
    activeCleanupFunctionsArray = [];
}

export function bootAskeeBlocks(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;

    cleanupAskeeBlocks();

    for (let blockIndex = 0; blockIndex < askeeBlocksArray.length; blockIndex += 1) {
        const blockInitFunction = askeeBlocksArray[blockIndex];
        try {
            const cleanupFunction = blockInitFunction(safeRootElement);
            if (typeof cleanupFunction === "function") {
                activeCleanupFunctionsArray.push(cleanupFunction);
            }
        } catch (error) {}
    }
}
