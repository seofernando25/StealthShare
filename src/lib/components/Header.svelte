<script lang="ts">
  import { tryLogin, tryRegister } from "$lib/auth";
  import { loggedUser } from "$lib/stores";
  let username: string = "";
  let password: string = "";
  let error: string = "";

  /**
   * Loads the user info from the server
   * If 404, creates a new user
   * Otherwise, check if hash matches
   * @param username
   * @param password
   */
  async function tryLoginRegister(username: string, password: string) {
    if (username === "" || password === "") {
      error = "Please enter an username and password";
      return;
    }

    // Try to login
    try {
      const login = await tryLogin(username, password);
      if (login) {
        loggedUser.set(login);
        error = "";
        return;
      }
    } catch (e) {
      console.log(e);
      error = e as string; // Invalid creds
      return;
    }

    // Try to register
    try {
      const user = await tryRegister(username, password);
      loggedUser.set(user);
    } catch (e) {
      console.log(e);
      error = e as string; // Username taken
    }
  }

  function logout() {
    loggedUser.set(null);
  }
</script>

<div class="navbar" />
