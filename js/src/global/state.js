const askeeStateObject = {
    data: {},
};

export function setAskeeStateValue(keyString, value) {
    askeeStateObject.data[keyString] = value;
    window.dispatchEvent(
        new CustomEvent("askee:state:change", {
            detail: {
                key: keyString,
                value: value,
            },
        })
    );
}

export function getAskeeStateValue(keyString) {
    return askeeStateObject.data[keyString];
}
