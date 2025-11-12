import { writable, type Writable } from 'svelte/store';
import type { UserLocalInfo } from './models/UserInfo';

export type FileEntry = {
    filename: string,
    uri: string,
}

export const uploadedFiles: Writable<FileEntry[]> = writable([]);

export const loggedUser: Writable<UserLocalInfo | null> = writable(null);