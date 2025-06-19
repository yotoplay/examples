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

    // If access token is expired, try to refresh it
    if (isTokenExpired(accessToken)) {
      console.log("Access token expired, attempting refresh...");

      if (!refreshToken) {
        console.log("No refresh token available");
        localStorage.removeItem(storageKey);
        return null;
      }

      try {
        const newTokens = await refreshTokens(refreshToken);
        accessToken = newTokens.accessToken;
        refreshToken = newTokens.refreshToken;

        // Store the new tokens
        localStorage.setItem(storageKey, JSON.stringify(newTokens));
        console.log("Token refresh successful");
      } catch (error) {
        console.error("Token refresh failed:", error);
        // If refresh fails, clear tokens and return null
        localStorage.removeItem(storageKey);
        return null;
      }
    }

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error parsing tokens from localStorage:", error);
    localStorage.removeItem(storageKey);
    return null;
  }
}

export async function refreshTokens(refreshToken) {
  console.log("Refreshing tokens...");

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
    const errorText = await tokenResponse.text();
    console.error("Refresh token request failed:", tokenResponse.status, errorText);
    throw new Error(`Refresh token request failed: ${tokenResponse.status} ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  console.log("Refresh successful, new tokens received");

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || refreshToken, // Use new refresh token if provided, otherwise keep the old one
  };
}
