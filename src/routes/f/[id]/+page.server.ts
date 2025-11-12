import { PUBLIC_STORAGE_URL } from "$env/static/public";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = (async ({ params }) => {
  const verifyUrl = `${PUBLIC_STORAGE_URL}/${params.id}`;
  // Call a HEAD request to the public storage URL
  const response = await fetch(verifyUrl, {
    method: "HEAD",
  });

  if (response.status !== 200) {
    throw error(404, "File not found");
  }
}) satisfies PageServerLoad;
