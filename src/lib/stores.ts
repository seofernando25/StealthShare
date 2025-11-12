import { writable, type Writable } from 'svelte/store';

export type FileEntry = {
    filename: string,
    uri: string,
}

export const uploadedFiles: Writable<FileEntry[]> = writable([]);
export const showFileList: Writable<boolean> = writable(false);