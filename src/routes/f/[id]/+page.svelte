<script lang="ts">
  import { page } from "$app/stores";
  import {
    AESdecryptBytes,
    generateAESKey,
    RSAdecryptBytes,
  } from "$lib/browserCrypt";
  import { loggedUser } from "$lib/stores";
  import { downloadData } from "$lib/util";
  import { PUBLIC_STORAGE_URL } from "$env/static/public";

  let pageId = $page.params.id;
  let origin = $page.url.origin;

  let file: File;
  let decryptionMethod: "ownKey" | "password" = "ownKey";
  let password = "";
  let error = "";

  async function onFileChange(event: Event) {
    const files = event.target as HTMLInputElement;
    if (files.files === null) {
      return;
    }
    file = files.files[0];
    console.log(file);
    let decrypted = await file.arrayBuffer();

    if (decryptionMethod === "ownKey") {
      // Get my private key
      if (!$loggedUser) {
        error = "You need to be logged in to decrypt with your key";
        return;
      }

      decrypted = await AESdecryptBytes(
        $loggedUser?.password,
        decrypted,
        $loggedUser?.aesKey
      );
    } else if (decryptionMethod === "password") {
      // Decrypt with password AWS
      const aesKey = await generateAESKey(password, password);

      try {
        decrypted = await AESdecryptBytes(password, decrypted, aesKey);
      } catch (e) {
        error = "Wrong password";
        return;
      }
    }

    const arr = new Uint8Array(decrypted);
    downloadData(file.name, arr);
  }

  async function decryptWithOwnKey() {
    decryptionMethod = "ownKey";
  }

  async function decryptWithPassword() {
    decryptionMethod = "password";

    if (password === "") {
      error = "You need to provide a password";
      return;
    } else {
      error = "";
    }
  }
</script>

<div class=" flex-1 flex flex-col justify-center items-center">
  <h1 class="text-5xl md:text-6xl lg:text-7xl pb-4 text-center w-full p-4">
    Download file
  </h1>

  <div class="h-48 justify-center w-full md:w-3/4 px-4">
    <a class="btn h-full w-full " href="{PUBLIC_STORAGE_URL}/{pageId}">Download</a>
  </div>

  {#if error}
    <p class="alert alert-error shadow-lg w-full">
      {error}
    </p>
  {/if}
</div>
<!-- Error -->

<input
  id="file"
  name="file"
  type="file"
  class="hidden"
  on:change="{onFileChange}"
/>
