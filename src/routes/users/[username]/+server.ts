import {
  userServerInfoSchema,
  type UserServerInfo,
} from "$lib/models/UserInfo";
// import { addUserKeys, getUserKeys } from "$lib/server/aws";
import type { RequestHandler } from "@sveltejs/kit";
import { z } from "zod";

export const GET = (async ({ params }) => {
  // if (!params.username) return new Response("Bad request", { status: 404 });
  // let userInfo: UserServerInfo;
  // try {
  //     userInfo = await getUserKeys(params.username);
  // } catch (error) {
  //     return new Response("User not found", { status: 404 });
  // }

  // return new Response(JSON.stringify(userInfo), { status: 200 });
  return new Response("User not found", { status: 404 });
}) satisfies RequestHandler;

export const POST = (async ({ request, params }) => {
  return new Response("User not found", { status: 404 });
  // try {
  //     await getUserKeys(params.username ?? '');
  //     return new Response("User already exists", { status: 409 });
  // } catch (error) {
  //     //If user does not exist, we are good to go
  // }

  // let userInfo: UserServerInfo;
  // try {
  //     const obj = await request.json();
  //     userInfo = userServerInfoSchema.parse(obj);
  // } catch (error) {
  //     console.log(error);
  //     if (error instanceof z.ZodError<UserServerInfo>) {
  //         return new Response(JSON.stringify(error.errors), { status: 400 });
  //     }
  //     return new Response("Bad request", { status: 400 });
  // }

  // try {
  //     await addUserKeys(params?.username ?? '', userInfo);
  // } catch (error) {
  //     console.log(error);
  //     return new Response("Bad request", { status: 400 });
  // }
  // return new Response("OK", { status: 200 });
}) satisfies RequestHandler;
