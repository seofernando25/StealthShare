
const ID_LENGTH = 6;

export function smallRandom() {
    return Math.random().toString(36).substring(2, ID_LENGTH + 2);
}

