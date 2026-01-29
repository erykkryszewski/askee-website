const askeeBlocksArray = [];

export function registerAskeeBlock(initFunction) {
    if (typeof initFunction !== "function") {
        return;
    }
    askeeBlocksArray.push(initFunction);
}

export function bootAskeeBlocks(rootElement) {
    const safeRootElement = rootElement instanceof Element ? rootElement : document;

    for (let blockIndex = 0; blockIndex < askeeBlocksArray.length; blockIndex += 1) {
        const blockInitFunction = askeeBlocksArray[blockIndex];
        try {
            blockInitFunction(safeRootElement);
        } catch (error) {}
    }
}
