import * as z from 'zod';
import { jsonWebKeySchema } from './other';

export interface UserLocalInfo {
    username: string;
    password: string;
    aesKey: CryptoKey;
    publicKey: CryptoKey;
    privateKey: CryptoKey;
}

// We don't store the username in the server info because it is already the key

export const userServerInfoSchema = z.object({
    hashedPassword: z.string(),
    publicKey: jsonWebKeySchema,
    encryptedPrivateKey: z.array(z.number()),
});

export type UserServerInfo = z.infer<typeof userServerInfoSchema>;
