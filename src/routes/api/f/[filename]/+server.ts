import { PUBLIC_STORAGE_URL } from "$env/static/public";
import { redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = (async ({ params, platform }) => {
  const filename = params.filename!;
  console.log("Redirecting to: ", `${PUBLIC_STORAGE_URL}/${filename}`);
  throw redirect(301, `${PUBLIC_STORAGE_URL}/${filename}`);
}) satisfies RequestHandler;

export const POST = (async ({ params, request, platform }) => {
  const storage = platform?.env?.HTH_STORAGE;
  const filename = params.filename!;
  if (!storage)
    return new Response(
      "File bucket not found (don't worry this is a server-side error)",
      { status: 500 }
    );
  // const head = await storage.head(filename);
  // if (head) {
  //   return new Response("Already exists", { status: 409 });
  // }

  const blob = await request.arrayBuffer();
  await storage.put(filename, blob);
  return new Response("OK", { status: 200 });
}) satisfies RequestHandler;
