export function deepEqual(object1: any, object2: any) {
    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);
    if (keys1.length !== keys2.length) {
        return false;
    }
    for (const key of keys1) {
        const val1 = object1[key];
        const val2 = object2[key];
        const areObjects = isObject(val1) && isObject(val2);
        if (
            areObjects && !deepEqual(val1, val2) ||
            !areObjects && val1 !== val2
        ) {
            return false;
        }
    }
    return true;
}

export function isObject(obj: any) {
    return obj != null && typeof obj === 'object';
}

export function intArrayToNumberArray(arr: Uint8Array) {
    let result = [];
    for (let i = 0; i < arr.length; i++) {
        result.push(arr[i]);
    }
    return result;
}

export function numberArrayToIntArray(arr: number[]) {
    let result = new Uint8Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
        result[i] = arr[i];
    }
    return result;
}


export function downloadData(filename: string, data: Uint8Array) {
    var element = document.createElement('a');
    const toStr = String.fromCharCode(...data);
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(toStr));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}