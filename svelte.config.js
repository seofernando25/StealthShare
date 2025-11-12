import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess({
    postcss: true,
  }),

  kit: {
    adapter: adapter(),
    // Allow larger file uploads (100MB limit)
    bodySizeLimit: 512 * 1024 * 1024, // 512MB
  },
};

export default config;
