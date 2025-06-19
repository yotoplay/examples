import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { getTokens, storageKey } from "./token-utils";

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    async function checkAuth() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");
      const error_description = params.get("error_description");

      if (error) {
        console.log("Error:", error);
        console.log("Error description:", error_description);
        return;
      }

      // If we have a code, we need to exchange it for tokens (new login)
      if (code) {
        console.log("Exchanging authorization code for tokens using PKCE...");
        console.log("Client ID:", import.meta.env.VITE_CLIENT_ID);
        console.log("Code:", code);
        console.log("Redirect URI:", window.location.origin);
        
        // Get the stored code verifier
        const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
        if (!codeVerifier) {
          console.error("No PKCE code verifier found");
          navigate("/login");
          return;
        }
        
        const res = await fetch("https://login.yotoplay.com/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: import.meta.env.VITE_CLIENT_ID,
            code_verifier: codeVerifier,
            code,
            redirect_uri: window.location.origin,
          }),
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Token exchange failed:", res.status, errorText);
          throw new Error(`Token exchange failed: ${res.status} ${errorText}`);
        }
        
        const json = await res.json();
        console.log("Token exchange successful:", json);

        // Clean up PKCE data
        sessionStorage.removeItem('pkce_code_verifier');

        localStorage.setItem(
          storageKey,
          JSON.stringify({
            accessToken: json.access_token,
            refreshToken: json.refresh_token,
          })
        );

        // We have the tokens stored, we can navigate to the app
        navigate("/app");
        return;
      }

      // Check if we have existing tokens
      const tokens = await getTokens();

      // If we don't have tokens stored, we need to login
      if (!tokens) {
        console.log("No tokens found, navigating to login");
        navigate("/login");
        return;
      }

      // If we have valid tokens, navigate to the app
      console.log("Valid tokens found, navigating to app");
      navigate("/app");
    }

    checkAuth();
  }, [navigate]);

  return <div>Checking auth...</div>;
}

export default Index;
