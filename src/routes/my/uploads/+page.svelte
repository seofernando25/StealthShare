<!-- TODO: Make this page look nicer -->
<script lang="ts">
  import { uploadedFiles } from "$lib/stores";
</script>

<div class=" flex-1 flex flex-col p-4">
  <h1 class="text-8xl">Uploads</h1>

  {#each $uploadedFiles as item}
    <a href={item.uri} class="btn btn-ghost">
      {item.filename}
    </a>
  {/each}
</div>
