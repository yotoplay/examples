import Configstore from "configstore";
import crypto from "node:crypto";
import "dotenv/config";
import express from "express";

const clientId = process.env.YOTO_CLIENT_ID;
const redirectPort = 8787;
const redirectHost = "127.0.0.1";
const redirectPath = "/callback";
const redirectUri = `http://${redirectHost}:${redirectPort}${redirectPath}`;
const config = new Configstore("yoto-card-alarm-example");
const scopes = [
  "offline_access",
  "family:devices:view",
  "family:devices:manage",
  "user:content:view",
].join(" ");

const alarm = {
  deviceId: "y2fm6PycZQYMuagOF831zUf3",
  cardId: "1rwMb",
  time: "1259",
  days: "0000100",
  volume: 6,
};

function createCodeVerifier() {
  return crypto.randomBytes(64).toString("base64url");
}

function createCodeChallenge(codeVerifier) {
  return crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
}

function createAuthorizationUrl({ clientId, codeChallenge, state }) {
  const authorizationUrl = new URL("https://login.yotoplay.com/authorize");
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
    audience: "https://api.yotoplay.com",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  }).toString();

  return authorizationUrl.toString();
}

function waitForAuthorizationCode({ expectedState }) {
  return new Promise((resolve, reject) => {
    const app = express();

    app.get(redirectPath, (request, response) => {
      const error = request.query.error;
      if (error) {
        response
          .status(400)
          .send(`Authentication failed: ${error}. You can close this tab.`);
        server.close();
        reject(new Error(`Authorization failed: ${error}`));
        return;
      }

      const state = request.query.state;
      if (state !== expectedState) {
        response
          .status(400)
          .send("Authentication failed: state did not match. You can close this tab.");
        server.close();
        reject(new Error("Authorization failed: state did not match"));
        return;
      }

      const code = request.query.code;
      if (!code) {
        response
          .status(400)
          .send("Authentication failed: missing code. You can close this tab.");
        server.close();
        reject(new Error("Authorization failed: missing code"));
        return;
      }

      response.send("Authentication complete. You can close this tab.");
      server.close();
      resolve(code);
    });

    const server = app.listen(redirectPort, redirectHost);
    server.once("error", (error) => {
      reject(error);
    });
  });
}

async function exchangeAuthorizationCode({ clientId, code, codeVerifier }) {
  const tokenResponse = await fetch("https://login.yotoplay.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
      audience: "https://api.yotoplay.com",
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(
      `Authorization code exchange failed: ${tokenResponse.statusText}`,
    );
  }

  const tokenData = await tokenResponse.json();
  return tokenData;
}

async function browserLogin({ clientId }) {
  if (!clientId) {
    throw new Error("clientId is required");
  }

  const codeVerifier = createCodeVerifier();
  const codeChallenge = createCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(32).toString("base64url");
  const authorizationUrl = createAuthorizationUrl({
    clientId,
    codeChallenge,
    state,
  });
  const codePromise = waitForAuthorizationCode({ expectedState: state });

  console.log("⚠️  Before continuing, make sure this callback URL is allowed in your Yoto app:");
  console.log(redirectUri);
  console.log("\nOpen this URL in your browser to authenticate:");
  console.log(authorizationUrl);
  console.log(`\nWaiting for the redirect on ${redirectUri} ...\n`);

  const code = await codePromise;
  const tokenData = await exchangeAuthorizationCode({
    clientId,
    code,
    codeVerifier,
  });

  console.log("Authorization successful, received tokens");
  return tokenData;
}

// Get fresh access token
async function getAccessTokens(clientId, refreshToken) {
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
      `Refresh token request failed: ${tokenResponse.statusText}`,
    );
  }

  const tokenData = await tokenResponse.json();
  return tokenData;
}

async function requestJson(url, options, action) {
  console.log(`${action}...`);
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(
      `${action} failed: ${response.status} ${await response.text()}`,
    );
  }

  return response.json();
}

function createAlarmString({ days, time, cardId, volume }) {
  if (!/^[01]{7}$/.test(days)) {
    throw new Error(
      "alarm.days must contain seven 0/1 characters ordered Monday through Sunday",
    );
  }

  if (volume > 8) {
    console.warn("Alarm volume is too high. Use 8 or lower.");
    throw new Error("alarm.volume must not exceed 8");
  }

  return `${days},${time},${cardId},,,${volume},1`;
}

async function fetchDevices(accessToken) {
  const { devices } = await requestJson(
    "https://api.yotoplay.com/device-v2/devices/mine",
    { headers: { Authorization: `Bearer ${accessToken}` } },
    "Fetching your players",
  );

  console.log(`Found ${devices.length} player(s)`);
  return devices;
}

async function fetchDeviceConfig(accessToken, deviceId) {
  const { device } = await requestJson(
    `https://api.yotoplay.com/device-v2/${deviceId}/config`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
    `Fetching config for ${deviceId}`,
  );

  if (!device?.config) {
    throw new Error(`Config response for ${deviceId} did not contain device.config`);
  }

  return device;
}

async function updateDeviceConfig(accessToken, deviceId, config) {
  return requestJson(
    `https://api.yotoplay.com/device-v2/${deviceId}/config`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deviceId, config }),
    },
    `Updating config for ${deviceId}`,
  );
}

function selectDevice(devices, deviceId) {
  const device = devices.find((candidate) => candidate.deviceId === deviceId);

  if (!device) {
    const availableDevices = devices
      .map((candidate) => `${candidate.name}: ${candidate.deviceId}`)
      .join("\n");
    throw new Error(
      `alarm.deviceId did not match a player. Available players:\n${availableDevices}`,
    );
  }

  return device;
}

async function main() {
  if (!clientId) {
    console.error("Error: YOTO_CLIENT_ID environment variable is required");
    process.exit(1);
  }

  console.log("⏰ Yoto Card Alarm Example");
  console.log("=========================\n");

  // Check if we already have a refresh token
  let savedRefreshToken = config.get("refresh_token");

  // If no refresh token, use browser login with a loopback callback
  if (!savedRefreshToken) {
    console.log("No saved authentication found. Starting browser login...\n");
    const response = await browserLogin({ clientId });
    savedRefreshToken = response.refresh_token;
    config.set("refresh_token", savedRefreshToken);
    console.log("✅ Authentication successful and saved!\n");
  } else {
    console.log("✅ Using saved authentication\n");
  }

  // Get access token
  const accessTokenData = await getAccessTokens(clientId, savedRefreshToken);
  const accessToken = accessTokenData.access_token;
  const refreshToken = accessTokenData.refresh_token;
  // save the refresh token for the next request
  config.set("refresh_token", refreshToken);

  const shouldWrite = process.argv.includes("--write");

  const devices = await fetchDevices(accessToken);
  const selectedDevice = selectDevice(devices, alarm.deviceId);
  const configuredDevice = await fetchDeviceConfig(accessToken, alarm.deviceId);
  const alarmString = createAlarmString(alarm);
  const existingAlarms = configuredDevice.config.alarms ?? [];

  console.log(`Player timezone: ${configuredDevice.geoTimezone}`);
  console.log(`Alarm wire value: ${alarmString}`);

  if (existingAlarms.includes(alarmString)) {
    console.log("That exact alarm already exists; nothing to update");
    return;
  }

  if (!shouldWrite) {
    console.log("Dry run only. Re-run with --write to create this alarm");
    return;
  }

  await updateDeviceConfig(accessToken, alarm.deviceId, {
    ...configuredDevice.config,
    alarms: [...existingAlarms, alarmString],
  });

  const updatedDevice = await fetchDeviceConfig(accessToken, alarm.deviceId);
  if (!updatedDevice.config.alarms?.includes(alarmString)) {
    throw new Error("The API accepted the update but the alarm was not persisted");
  }

  console.log(
    `Created an alarm on ${selectedDevice.name} for ${alarm.time} (${configuredDevice.geoTimezone})`,
  );
}

main();
