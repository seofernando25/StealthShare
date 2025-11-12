// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface Platform {}
    interface Platform {
      env?: {
        HTH_STORAGE: R2Bucket;
        HTH_USERS: R2Bucket;
      };
    }
  }
}

export {};
