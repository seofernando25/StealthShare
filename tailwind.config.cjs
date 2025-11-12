module.exports = {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  plugins: [require("@tailwindcss/typography"), require("daisyui")],
  daisyui: {
    themes: [
      {
        dark: {
          primary: "#ffff",
          secondary: "#f000b8",
          accent: "#37cdbe",
          neutral: "#2a2e37",
          "base-100": "#3d4451",
          "base-content": "#ebecf0",
          info: "#2563eb",
          success: "#87d039",
          warning: "#e2d562",
          error: "#ff6f6f",
        },
      },
    ],
  },
};
