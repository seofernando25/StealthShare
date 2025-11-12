<script lang="ts">
  import { onMount } from "svelte";
  import { uploadedFiles, showFileList, type FileEntry } from "$lib/stores";
  import SpaceBackground from "$lib/components/SpaceBackground.svelte";
  import "../app.css";
  

  let { children } = $props();
  let fileListVisible = $state(false);

  onMount(() => {
    // Check if we have a "uploads" key in localStorage a json array
    const uploads = localStorage.getItem("uploads");
    if (!uploads) {
      localStorage.setItem("uploads", JSON.stringify([]));
    } else {
      // If we do, parse it and add it to the uploads array
      const parsed: FileEntry[] = JSON.parse(uploads);
      uploadedFiles.set(parsed);
    }
    
    // Subscribe to showFileList store
    const unsubscribe = showFileList.subscribe(value => {
      fileListVisible = value;
    });
    
    return () => unsubscribe();
  });
</script>

<div class="space-background-wrapper" class:fade-out={fileListVisible}>
  <SpaceBackground />
</div>

<div class="h-screen flex flex-col relative z-10">
  {@render children?.()}
</div>

<style>
  .space-background-wrapper {
    transition: opacity 0.5s ease;
  }
  
  .space-background-wrapper.fade-out {
    opacity: 0;
  }
</style>
