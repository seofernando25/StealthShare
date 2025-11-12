<script lang="ts">
  import { onMount } from "svelte";
  import { uploadedFiles, type FileEntry } from "$lib/stores";
  import Header from "$lib/components/Header.svelte";
  import image from "$lib/assets/secret_sauce.webp";

  onMount(async () => {
    // Check if we have a "uploads" key in localStorage a json array
    const uploads = localStorage.getItem("uploads");
    if (!uploads) {
      localStorage.setItem("uploads", JSON.stringify([]));
    } else {
      // If we do, parse it and add it to the uploads array
      const parsed: FileEntry[] = JSON.parse(uploads);
      uploadedFiles.set(parsed);
    }
  });
</script>

<div class="h-screen flex flex-col">
  <Header />
  <slot />
</div>

<img class="bottom-art" draggable="false" src="{image}" alt="secret sauce" />

<style>
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  /* Bottom right image, that is slightly hidden and does not cause overflow */
  .bottom-art {
    position: fixed;
    bottom: 0;
    right: 0;
    /* Scale height relative to viewport height */
    height: min(30vh, 30vw);

    transform: translate(-10%, 30%);
    transition: transform 0.2s ease-in-out;
  }

  /* on hover goes slightly up */

  .bottom-art:hover {
    transform: translate(-10%, 30%) translateY(-30px);
    transition: transform 0.2s ease-in-out;
  }
</style>
