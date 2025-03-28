import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { getTokens, storageKey } from "./token-utils";

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    async function checkAuth() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      const tokens = await getTokens();

      // If we don't have tokens stored, we need to login
      if (!tokens) {
        navigate("/login");
      }

      // If we have a code, we need to exchange it for tokens
      if (code) {
        const res = await fetch("https://login.yotoplay.com/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: import.meta.env.VITE_CLIENT_ID,
            client_secret: import.meta.env.VITE_CLIENT_SECRET,
            code,
            redirect_uri: window.location.origin,
          }),
        });
        const json = await res.json();

        localStorage.setItem(
          storageKey,
          JSON.stringify({
            accessToken: json.access_token,
            refreshToken: json.refresh_token,
          })
        );

        // We have the tokens stored, we can navigate to the app
        navigate("/app");
      }
    }

    checkAuth();
  }, [navigate]);

  return <div>Checking auth...</div>;
}

export default Index;
