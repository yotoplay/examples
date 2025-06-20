import React from "react";
import pkceChallenge from "pkce-challenge";

export default function Login() {
  const clientId = import.meta.env.VITE_CLIENT_ID;

  if (!clientId) {
    throw new Error("VITE_CLIENT_ID is not set");
  }

  const handleLogin = async () => {
    try {
      // Generate PKCE code verifier and challenge using the npm package
      const { code_verifier, code_challenge } = await pkceChallenge();
      
      // Store the code verifier in session storage for the token exchange
      sessionStorage.setItem('pkce_code_verifier', code_verifier);
      
      const authUrl = new URL("https://login.yotoplay.com/authorize");
      authUrl.search = new URLSearchParams({
        audience: "https://api.yotoplay.com",
        scope: "openid offline_access",
        response_type: "code",
        client_id: clientId,
        code_challenge: code_challenge,
        code_challenge_method: "S256",
        redirect_uri: window.location.origin,
      }).toString();

      window.location.href = authUrl.toString();
    } catch (error) {
      console.error("Error generating PKCE:", error);
    }
  };

  return (
    <div>
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
