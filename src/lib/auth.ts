import {
  createUserLocalInfo,
  serverInfoToUserInfo,
  userInfoToServerInfo,
} from "./browserCrypt";
import type { UserLocalInfo, UserServerInfo } from "./models/UserInfo";

/**
 * Returns the UserLocalInfo if the user exists and the password is correct
 * throws an error if the password is incorrect
 * and returns null if the user does not exist
 * @param {string} username
 * @param {string} password
 */
export async function tryLogin(
  username: string,
  password: string
): Promise<UserLocalInfo | null> {
  const res = await fetch(`/users/${username}`, {
    method: "GET",
  });

  switch (res.status) {
    case 200: {
      const serverUserInfo: UserServerInfo = await res.json();
      const userInfo = await serverInfoToUserInfo(
        serverUserInfo,
        username,
        password
      );
      if (userInfo) {
        return userInfo;
      } else {
        throw new Error("Bad credentials");
      }
    }
    case 404: {
      return null;
    }
    default:
      throw new Error("Bad credentials");
  }
}

export async function tryRegister(
  username: string,
  password: string
): Promise<UserLocalInfo> {
  // 409, 200, 400 are the only possible responses

  console.log("Created user info");
  const info = await createUserLocalInfo(username, password);
  const serverInfo: UserServerInfo = await userInfoToServerInfo(info);

  const res = await fetch(`/users/${username}`, {
    method: "POST",
    body: JSON.stringify(serverInfo),
  });

  switch (res.status) {
    case 200: {
      return info;
    }
    case 409: {
      throw new Error("User already exists");
    }
    default:
      throw new Error("Bad credentials");
  }
}
