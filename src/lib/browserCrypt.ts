import type { UserServerInfo, UserLocalInfo } from "./models/UserInfo";
import { intArrayToNumberArray, numberArrayToIntArray } from "./util";

const AES_TYPE = "AES-GCM";
const RSA_TYPE = "RSA-OAEP";
const PRIVATE_KEY_EXPORT_TYPE = "pkcs8";

export async function SHADigest(msg: ArrayBufferLike | ArrayLike<number> | string) {
    if (typeof msg === "string") {
        msg = new TextEncoder().encode(msg);
    }
    const msgArray = new Uint8Array(msg)
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgArray);
    return hashBuffer;
}

export async function generateAESKey(username: string, password: string) {
    const usernameBytes = new TextEncoder().encode(username);
    const passwordBytes = new TextEncoder().encode(password);

    const keyData = await SHADigest([...usernameBytes, ...passwordBytes]);

    const key = await window.crypto.subtle.importKey(
        "raw",
        keyData,
        AES_TYPE,
        false,
        ["encrypt", "decrypt"]
    );

    return key;
}

export async function generateRSAKey() {
    return await window.crypto.subtle.generateKey(
        {
            name: RSA_TYPE,
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );
}

export async function RSAencryptBytes(data: Uint8Array, key: CryptoKey) {
    // gEN NEW RS key
    const keyPair = await generateRSAKey();
    console.log("encrypting")
    const encrypted = await window.crypto.subtle.encrypt(
        {
            name: RSA_TYPE,
        },
        keyPair.publicKey,
        data
    );
    console.log("encrypted")
    console.log(encrypted);
    return encrypted;
}

export async function RSAdecryptBytes(data: BufferSource, key: CryptoKey) {
    const decrypted = await window.crypto.subtle.decrypt(
        {
            name: RSA_TYPE,
        },
        key,
        data
    );
    return decrypted;
}

export async function AESencryptBytes(ivSource: string, data: BufferSource, key: CryptoKey) {
    const iv = await SHADigest(ivSource);
    const encrypted = await window.crypto.subtle.encrypt(
        {
            name: AES_TYPE,
            iv,
        },
        key,
        data
    );
    const uintArr = new Uint8Array(encrypted);
    return uintArr;
}


export async function AESdecryptBytes(ivSource: string, data: BufferSource | string, key: CryptoKey) {
    if (typeof data === "string") {
        console.log("decoding stuff")
        data = new TextEncoder().encode(data);
    }

    console.log(key);
    const iv = await SHADigest(ivSource);
    const decrypted = await window.crypto.subtle.decrypt(
        {
            name: AES_TYPE,
            iv,
        },
        key,
        data
    );
    const uintArr = new Uint8Array(decrypted);
    return uintArr;
}

export async function createUserLocalInfo(username: string, password: string) {
    const { publicKey, privateKey } = await generateRSAKey();
    const aesKey = await generateAESKey(username, password);
    const userInfo: UserLocalInfo = {
        username,
        password,
        aesKey,
        publicKey,
        privateKey
    }
    return userInfo;
}

export async function userInfoToServerInfo(userInfo: UserLocalInfo) {
    const { username, password, publicKey, privateKey, aesKey } = userInfo;
    const hashedPassword = await SHADigest(password);
    const hashedPasswordString = new TextDecoder().decode(hashedPassword);

    const exportPrivateKey = await window.crypto.subtle.exportKey(
        PRIVATE_KEY_EXPORT_TYPE,
        privateKey
    );

    const encryptedPrivateKey = await AESencryptBytes(
        username,
        exportPrivateKey,
        aesKey
    );

    const encryptedPrivateKeyString = intArrayToNumberArray(encryptedPrivateKey);

    const exportPublicKey = await window.crypto.subtle.exportKey(
        "jwk",
        publicKey
    );


    const serverInfo: UserServerInfo = {
        hashedPassword: hashedPasswordString,
        publicKey: exportPublicKey,
        encryptedPrivateKey: encryptedPrivateKeyString
    }
    return serverInfo;
}

export async function serverInfoToUserInfo(serverInfo: UserServerInfo, username: string, password: string): Promise<UserLocalInfo | null> {
    const aesKey = await generateAESKey(username, password);

    const serverInfoPubKey = await publicRSAJsonWebTokenToCryptoKey(
        serverInfo.publicKey
    );

    const serverInfoPrivKeyBuff = await AESdecryptBytes(
        username,
        numberArrayToIntArray(serverInfo.encryptedPrivateKey),
        aesKey
    );

    const serverInfoPrivKey = await arrayBufferToPrivateRSAKey(
        serverInfoPrivKeyBuff
    );

    // Check if password matches
    const hashedPasswordString = new TextDecoder().decode(await SHADigest(password));
    if (hashedPasswordString !== serverInfo.hashedPassword) {
        console.log("Password doesn't match");
        return null;
    }

    return {
        username,
        password,
        aesKey,
        privateKey: serverInfoPrivKey,
        publicKey: serverInfoPubKey
    }
}

export async function publicRSAJsonWebTokenToCryptoKey(jwk: JsonWebKey) {
    return await window.crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: RSA_TYPE,
            hash: "SHA-256",
        },
        true,
        ["encrypt"]
    );
}

// Don't forget to decrypt the array buffer first
export async function arrayBufferToPrivateRSAKey(arrayBuffer: ArrayBuffer) {
    return await window.crypto.subtle.importKey(
        PRIVATE_KEY_EXPORT_TYPE,
        arrayBuffer,
        {
            name: RSA_TYPE,
            hash: "SHA-256",
        },
        true,
        ["decrypt"]
    );
}