import Configstore from "configstore";
import "dotenv/config";

const clientId = process.env.YOTO_CLIENT_ID;
const config = new Configstore("yoto-cards-list");

const sleep = (t) => new Promise((resolve) => setTimeout(resolve, t));

// Device code auth
async function deviceLogin({ clientId }) {
  if (!clientId) {
    throw new Error("clientId is required");
  }

  // Get the device auth urls
  const deviceAuthResponse = await fetch(
    "https://login.yotoplay.com/oauth/device/code",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        scope: "openid profile offline_access",
        audience: "https://api.yotoplay.com",
      }),
    }
  );

  if (!deviceAuthResponse.ok) {
    throw new Error(
      `Device authorization failed: ${deviceAuthResponse.statusText}`
    );
  }

  const authResult = await deviceAuthResponse.json();
  const {
    device_code,
    verification_uri,
    verification_uri_complete,
    user_code,
    interval = 5,
    expires_in = 300,
  } = authResult;

  console.table({
    verification_uri,
    verification_uri_complete,
    user_code,
    expires_in_minutes: Math.round(expires_in / 60),
  });

  // Poll for the token
  let intervalMs = interval * 1000;

  while (true) {
    const tokenResponse = await fetch(
      "https://login.yotoplay.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code,
          client_id: clientId,
          audience: "https://api.yotoplay.com",
        }),
      }
    );

    const responseBody = await tokenResponse.json();

    if (tokenResponse.ok) {
      console.log("Authorization successful, received tokens");
      return responseBody;
    }

    if (tokenResponse.status === 403) {
      const errorData = responseBody;
      if (errorData.error === "authorization_pending") {
        console.log("Authorization pending, waiting...");
        await sleep(intervalMs);
        continue;
      } else if (errorData.error === "slow_down") {
        intervalMs += 5000;
        console.log(
          `Received slow_down, increasing interval to ${intervalMs}ms`
        );
        await sleep(intervalMs);
        continue;
      } else if (errorData.error === "expired_token") {
        throw new Error(
          "Device code has expired. Please restart the device login process."
        );
      } else {
        throw new Error(errorData.error_description || errorData.error);
      }
    }

    throw new Error(`Token request failed: ${tokenResponse.statusText}`);
  }
}

// Get fresh access token
async function getAccessToken(clientId, refreshToken) {
  const tokenResponse = await fetch("https://login.yotoplay.com/oauth/token", {
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
  return tokenData.access_token;
}

async function main() {
  if (!clientId) {
    console.error("Error: YOTO_CLIENT_ID environment variable is required");
    process.exit(1);
  }

  console.log("🎵 Yoto Node.js Example");
  console.log("=========================\n");

  // Check if we already have a refresh token
  let savedRefreshToken = config.get("refresh_token");

  // If no refresh token, do device login
  if (!savedRefreshToken) {
    console.log("No saved authentication found. Starting device login...\n");
    const response = await deviceLogin({ clientId });
    savedRefreshToken = response.refresh_token;
    config.set("refresh_token", savedRefreshToken);
    console.log("✅ Authentication successful and saved!\n");
  } else {
    console.log("✅ Using saved authentication\n");
  }

  // Get access token
  const accessToken = await getAccessToken(clientId, savedRefreshToken);

  // Get cards
  console.log("📚 Fetching your cards...");
  const cardsResponse = await fetch("https://api.yotoplay.com/content/mine", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!cardsResponse.ok) {
    throw new Error(`Cards request failed: ${cardsResponse.statusText}`);
  }

  const { cards } = await cardsResponse.json();

  console.log(`🎉 Found ${cards.length} card(s):\n`);
}

main();
