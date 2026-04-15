import React from "react";
import { useLocation } from "react-router";
import pkceChallenge from "pkce-challenge";

const defaultScopes = [
  "openid",
  "family:library:view",
  "user:content:view",
].join(" ");

export default function Login() {
  const location = useLocation();
  const clientId = import.meta.env.VITE_CLIENT_ID;
  const params = new URLSearchParams(location.search);
  const error = params.get("error");
  const errorDescription = params.get("error_description");

  if (!clientId) {
    throw new Error("VITE_CLIENT_ID is not set");
  }

  const handleLogin = async () => {
    // Generate PKCE code verifier and challenge using the npm package.
    const { code_verifier, code_challenge } = await pkceChallenge();

    // Store the code verifier in session storage for the token exchange.
    sessionStorage.setItem("pkce_code_verifier", code_verifier);

    const authUrl = new URL("https://login.yotoplay.com/authorize");
    authUrl.search = new URLSearchParams({
      audience: "https://api.yotoplay.com",
      scope: defaultScopes,
      response_type: "code",
      client_id: clientId,
      code_challenge: code_challenge,
      code_challenge_method: "S256",
      redirect_uri: window.location.origin,
    }).toString();

    window.location.href = authUrl.toString();
  };

  return (
    <div>
      {error ? (
        <div>
          <p>Authentication failed: {error}</p>
          {errorDescription ? <p>{errorDescription}</p> : null}
        </div>
      ) : null}
      <p>Requested scopes: {defaultScopes}</p>
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
