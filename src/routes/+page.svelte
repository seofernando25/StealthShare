<script lang="ts">
  import {
    AESencryptBytes,
    generateAESKey,
    publicRSAJsonWebTokenToCryptoKey,
    RSAencryptBytes,
  } from "$lib/browserCrypt";
  import type { UserServerInfo } from "$lib/models/UserInfo";
  import { loggedUser, uploadedFiles } from "$lib/stores";
  import { page } from "$app/stores";
  import QrCode from "$lib/components/QrCode.svelte";

  let isUploading = false;

  type SendTypes = "unencrypted" | "private" | "protected" | "transfer";
  let selectedSendType: SendTypes = "unencrypted";
  let encryptionPassword = "";
  let recipientName = "";
  let fileName = "";

  // Update file name when file changes
  $: if (currentFiles && currentFiles[0] && fileName === "") {
    fileName = currentFiles[0].name;
  }

  let currentFiles: FileList;
  const FILE_SIZE_LIMIT_MB = 100; // 100MB

  export let uploadStatus: { uri?: string; error?: string } = {};

  let _ignoreFirst = true;
  function updateError() {
    if (_ignoreFirst) {
      _ignoreFirst = false;
      return;
    }

    uploadStatus.error = "";
    if (!currentFiles || !currentFiles[0]) {
      uploadStatus.error = "No files";
      return;
    } else {
      if (currentFiles[0].size > FILE_SIZE_LIMIT_MB * 1024 * 1024) {
        uploadStatus.error = `File too big!`;
        return;
      }
    }
    if (fileName === "") {
      uploadStatus.error = "You need to provide a file name";
      return;
    }
  }

  $: {
    currentFiles;
    // fileName;
    updateError();
  }

  const reqUploadFile = async () => {
    updateError();
    if (uploadStatus.error) {
      return;
    }

    if (isUploading) {
      return;
    }

    await uploadFile(currentFiles, fileName);
  };

  const uploadFile = async (fileList: FileList, fileName: string) => {
    isUploading = true;
    const file = fileList[0];
    console.log(file);
    let fileBuffer = await file.arrayBuffer();
    let encryptedRecipientName = "";
    switch (selectedSendType) {
      case "unencrypted":
        break;
      case "private": {
        if ($loggedUser === null) {
          uploadStatus.error = "You need to log in to upload private files";
          return;
        }
        // Encrypt file with user's AES key

        const aesKey = $loggedUser.aesKey;
        fileBuffer = await AESencryptBytes(
          $loggedUser.password,
          fileBuffer,
          aesKey
        );
        console.log(fileBuffer);
        break;
      }
      case "protected": {
        if (encryptionPassword === "") {
          uploadStatus.error = "You need to provide a password";
          return;
        }

        // Encrypt file with password
        const aesKey = await generateAESKey(
          encryptionPassword,
          encryptionPassword
        );
        fileBuffer = await AESencryptBytes(
          encryptionPassword,
          fileBuffer,
          aesKey
        );
        break;
      }
      case "transfer": {
        if (recipientName === "") {
          uploadStatus.error = "You need to provide a recipient";
          return;
        }

        // Fetch recipient's public key
        const recipient = await fetch(`/users/${recipientName}`);

        if (recipient.status !== 200) {
          uploadStatus.error = "Recipient not found";
          return;
        }

        const recipientInfo: UserServerInfo = await recipient.json();
        const encryptionKey = await publicRSAJsonWebTokenToCryptoKey(
          recipientInfo.publicKey
        );

        const dataArr = new Uint8Array(fileBuffer);
        fileBuffer = await RSAencryptBytes(dataArr, encryptionKey);

        const recipientNameBytes = await RSAencryptBytes(
          new TextEncoder().encode(recipientName),
          encryptionKey
        );
        encryptedRecipientName = new TextDecoder().decode(recipientNameBytes);
        break;
      }
    }

    console.log("uploading file");

    fileBuffer = new Uint8Array(fileBuffer);

    const results = await fetch(`api/f/${fileName}`, {
      method: "POST",
      body: fileBuffer,
    });

    if (results.status !== 200) {
      if (results.status === 413) {
        uploadStatus.error = "File too big";
        isUploading = false;
        return;
      }

      try {
        uploadStatus.error = await results.text();
      } catch (error) {
        uploadStatus.error = "Something went wrong";
      }
      isUploading = false;
      return;
    }

    const res = await results.text();
    console.log("file uploaded");
    isUploading = false;
    $uploadedFiles = [...$uploadedFiles, { filename: fileName, uri: res }];
    localStorage.setItem("uploads", JSON.stringify($uploadedFiles));
    const lastFragment = res.split("/").pop();
    if (!lastFragment) {
      uploadStatus.error = "No file id, something went wrong";
      return;
    }
    uploadStatus.uri = $page.url + "f/" + fileName;
  };

  async function dropHandler(event: DragEvent) {
    if (!event.dataTransfer) {
      return;
    }
    const items = event.dataTransfer.files;
    if (items.length === 0) {
      uploadStatus.error = "Not a file";
      return;
    }

    const droppedFile = items[0];
    if (!droppedFile) {
      uploadStatus.error = "Not a file";
      return;
    }

    fileName = droppedFile.name;
    currentFiles = event.dataTransfer.files;
  }
</script>

<!-- on:drop|preventDefault="{dropHandler}" -->
<!-- on:dragover|preventDefault -->
<div
  class="flex flex-col"
  on:drop|preventDefault="{dropHandler}"
  on:dragover|preventDefault
>
  <div class="prose text-center self-center">
    <h1 class="">StealthShare</h1>
    <h2 class="text-xl text-gray-400 pb-4 mb-10">
      Store your files fast, safe and anonymously!
    </h2>
  </div>
  <div class=" flex-1 flex flex-col items-center gap-4 container self-center">
    <input
      type="text"
      class=" input input-bordered w-full input-primary"
      placeholder="File name"
      bind:value="{fileName}"
    />
    {#if uploadStatus?.uri}
      <a
        href="{uploadStatus.uri}"
        class="alert alert-success shadow-lg rounded-none">{uploadStatus.uri}</a
      >
      <div class="flex flex-col items-center gap-4 h-36">
        <QrCode value="{uploadStatus.uri}" />
      </div>
    {/if}
    {#if uploadStatus?.error}
      <p class="alert alert-error shadow-lg rounded-none">
        {@html uploadStatus.error}
      </p>
    {/if}
    <progress class="progress w-full  {isUploading ? '' : 'hidden'}"></progress>
    <div class="h-36 w-full flex flex-col items-center gap-4">
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <label
        tabindex="0"
        on:keydown="{(e) => {
          if (e.key === 'Enter') {
            document.getElementById('file')?.click();
          }
        }}"
        for="file"
        class="w-full flex-1 btn btn-primary rounded-3xl shadow-2xl"
      >
        <h2 class="text-primary-content">
          Drop a file or <span class=" link  link-info cursor-pointer">
            Click
          </span>
        </h2>
      </label>

      <input
        id="file"
        name="file"
        type="file"
        class="hidden"
        bind:files="{currentFiles}"
      />
    </div>
    <!-- Submit button -->
    <!-- TODO: Add submit stuff -->
    <input
      type="submit"
      class="btn btn-accent w-full h-24 
    {uploadStatus.error ? 'btn-disabled' : ''}
    {currentFiles ? '' : 'btn-disabled'} 
    {isUploading ? 'btn-disabled' : ''} 
    {fileName ? '' : 'btn-disabled'}
    "
      on:click="{reqUploadFile}"
      value="Upload"
    />

    <!-- File size limit -->
    <p class="text-gray-400 text-sm">
      Max file size: {FILE_SIZE_LIMIT_MB} MB
    </p>
  </div>
</div>
