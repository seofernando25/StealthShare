<script lang="ts">
  import { run } from 'svelte/legacy';

  import { onMount } from "svelte";
  import QRCode from "qrcode";
  import { browser } from "$app/environment";
  interface Props {
    value?: string;
  }

  let { value = "" }: Props = $props();

  let image = $state("");
  let url = "";

  async function generateQrCode() {
    image = await QRCode.toDataURL(value, {
      color: {
        dark: "#ffffff",
        light: "#00000000",
      },
    });
  }

  export function getImage() {
    return image;
  }
  run(() => {
    if (value && browser) {
      generateQrCode();
    }
  });
  onMount(() => {
    generateQrCode();
  });
</script>

<img
  src="{image}"
  alt="{value}"
  class="w-full h-full aspect-square object-contain"
/>
