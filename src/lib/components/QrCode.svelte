<script lang="ts">
  import QRCode from "qrcode";
  interface Props {
    value?: string;
  }

  let { value = "" }: Props = $props();

  let image = $state("");

  async function generateQrCode() {
    image = await QRCode.toDataURL(value);
  }

  $effect.pre(() => {
    if (value) {
      generateQrCode();
    }
  });
</script>

{#if image}
  <img
    src="{image}"
    alt="{value}"
    class="w-full h-full aspect-square object-contain"
  />
{/if}
