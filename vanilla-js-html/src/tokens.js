// Token management
export const getStoredTokens = () => {
  const accessToken = localStorage.getItem("yoto_access_token");
  const refreshToken = localStorage.getItem("yoto_refresh_token");
  return { accessToken, refreshToken };
};

export const storeTokens = (accessToken, refreshToken) => {
  localStorage.setItem("yoto_access_token", accessToken);
  localStorage.setItem("yoto_refresh_token", refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem("yoto_access_token");
  localStorage.removeItem("yoto_refresh_token");
};

export const refreshAccessToken = async (refreshToken) => {
  const clientId = import.meta.env.VITE_CLIENT_ID;

  console.log("Refreshing access token...");

  const response = await fetch("https://login.yotoplay.com/oauth/token", {
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

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to refresh token:", response.status, errorText);
    throw new Error(`Failed to refresh token: ${response.status} ${errorText}`);
  }

  const { access_token, refresh_token } = await response.json();
  console.log("Token refresh successful");

  // Use new refresh token if provided, otherwise keep the old one
  const newRefreshToken = refresh_token || refreshToken;
  storeTokens(access_token, newRefreshToken);
  return access_token;
};
