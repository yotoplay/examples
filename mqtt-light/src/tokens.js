// Token management
const clientId = import.meta.env.VITE_CLIENT_ID;
const clientSecret = import.meta.env.VITE_CLIENT_SECRET;

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
  const response = await fetch("https://login.yotoplay.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  const { access_token, refresh_token } = await response.json();
  storeTokens(access_token, refresh_token);
  return access_token;
};
