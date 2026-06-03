import Configstore from "configstore";
import crypto from "node:crypto";
import { createServer } from "node:http";
import "dotenv/config";

const clientId = process.env.YOTO_CLIENT_ID;
const redirectPort = 8787;
const redirectHost = "127.0.0.1";
const redirectPath = "/callback";
const redirectUri = `http://${redirectHost}:${redirectPort}${redirectPath}`;
const config = new Configstore("yoto-nodejs-localhost-example-aaa");
const scopes = [
  "offline_access",
  "family:library:view",
  "user:content:view",
].join(" ");

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
    const server = createServer((request, response) => {
      const requestUrl = new URL(request.url, redirectUri);

      if (requestUrl.pathname !== redirectPath) {
        response.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
        return;
      }

      const error = requestUrl.searchParams.get("error");
      if (error) {
        response
          .writeHead(400, { "Content-Type": "text/plain" })
          .end(`Authentication failed: ${error}. You can close this tab.`);
        server.close();
        reject(new Error(`Authorization failed: ${error}`));
        return;
      }

      const state = requestUrl.searchParams.get("state");
      if (state !== expectedState) {
        response
          .writeHead(400, { "Content-Type": "text/plain" })
          .end("Authentication failed: state did not match. You can close this tab.");
        server.close();
        reject(new Error("Authorization failed: state did not match"));
        return;
      }

      const code = requestUrl.searchParams.get("code");
      if (!code) {
        response
          .writeHead(400, { "Content-Type": "text/plain" })
          .end("Authentication failed: missing code. You can close this tab.");
        server.close();
        reject(new Error("Authorization failed: missing code"));
        return;
      }

      response
        .writeHead(200, { "Content-Type": "text/plain" })
        .end("Authentication complete. You can close this tab.");
      server.close();
      resolve(code);
    });

    server.once("error", (error) => {
      reject(error);
    });

    server.listen(redirectPort, redirectHost);
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

async function main() {
  if (!clientId) {
    console.error("Error: YOTO_CLIENT_ID environment variable is required");
    process.exit(1);
  }

  console.log("🎵 Yoto Node.js Example");
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
