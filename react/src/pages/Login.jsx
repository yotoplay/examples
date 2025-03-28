import React from "react";

export default function Login() {
  const clientId = import.meta.env.VITE_CLIENT_ID;

  if (!clientId) {
    throw new Error("CLIENT_ID is not set");
  }

  const handleLogin = () => {
    const authUrl = new URL("https://login.yotoplay.com/authorize");
    authUrl.search = new URLSearchParams({
      audience: "https://api.yotoplay.com",
      scope: "openid offline_access",
      response_type: "code",
      client_id: clientId,
      redirect_uri: window.location.origin,
    }).toString();

    window.location.href = authUrl.toString();
  };

  return (
    <div>
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
