import { jwtDecode } from "jwt-decode";

export const storageKey = "YOTO_SAMPLE_REACT";

const clientId = import.meta.env.VITE_CLIENT_ID;
const tokenUrl = "https://login.yotoplay.com/oauth/token";

export function isTokenExpired(token) {
  if (!token) {
    return true;
  }

  try {
    const decodedToken = jwtDecode(token);
    return Date.now() >= (decodedToken.exp ?? 0) * 1000;
  } catch (error) {
    console.error("Error decoding token:", error);
    return true;
  }
}

export async function getTokens() {
  const tokensRaw = localStorage.getItem(storageKey);

  if (!tokensRaw) {
    return null;
  }

  try {
    let { accessToken, refreshToken } = JSON.parse(tokensRaw);

    if (isTokenExpired(accessToken)) {
      const newTokens = await refreshTokens(refreshToken);
      accessToken = newTokens.accessToken;
      refreshToken = newTokens.refreshToken;
      localStorage.setItem(storageKey, JSON.stringify(newTokens));
    }

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error parsing tokens from localStorage:", error);
    localStorage.removeItem(storageKey);
    return null;
  }
}

export async function refreshTokens(refreshToken) {
  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: refreshToken,
      audience: "https://api.yotoplay.com",
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(
      `Refresh token request failed: ${tokenResponse.statusText}`
    );
  }

  const tokenData = await tokenResponse.json();

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
  };
}
