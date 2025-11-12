import { PUBLIC_USERS_URL } from "$env/static/public";
import { redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = (async ({ params, platform }) => {
  const username = params.username!;
  throw redirect(301, `${PUBLIC_USERS_URL}/${username}`);
}) satisfies RequestHandler;

export const POST = (async ({ params, request, platform }) => {
  const storage = platform?.env?.HTH_USERS;
  const username = params.username!;
  if (!storage) return new Response("Users bucket not found", { status: 500 });

  const head = await storage.head(username);
  if (head) {
    return new Response("User already exists", { status: 409 });
  }

  const blob = await request.arrayBuffer();
  console.log("Creating new user: ", username);
  storage.put(username, blob);
  return new Response("OK", { status: 200 });
}) satisfies RequestHandler;
