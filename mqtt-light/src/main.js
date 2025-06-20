import "./style.css";
import mqtt from "mqtt";
import debounce from "lodash.debounce";
import { jwtDecode } from "jwt-decode";
import {
  getStoredTokens,
  storeTokens,
  clearTokens,
  refreshAccessToken,
} from "./tokens";
import pkceChallenge from "pkce-challenge";

const MQTT_URL = "wss://aqrphjqbp3u2z-ats.iot.eu-west-2.amazonaws.com";
const MQTT_AUTH_NAME = "PublicJWTAuthorizer";
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;

if (!CLIENT_ID) {
  throw new Error("Missing Yoto OAuth credentials in .env file");
}

let mqttClient = null;
let deviceId = null;

// check if token is expired
const isTokenExpired = (token) => {
  const decodedToken = jwtDecode(token);
  return Date.now() >= (decodedToken.exp ?? 0) * 1000;
};

const getValidAccessToken = async () => {
  const { accessToken, refreshToken } = getStoredTokens();

  if (!accessToken) return null;

  if (isTokenExpired(accessToken)) {
    return await refreshAccessToken(refreshToken);
  }

  return accessToken;
};

// Handle OAuth callback and login flow
const handleAuthCallback = async () => {
  // Check if we have an authorization code (we've just been redirected from Yoto's login page)
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const error = params.get("error");

  if (error) {
    console.error("Authorization error:", error);
    return null;
  }

  if (code) {
    // Get the stored code verifier
    const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
    if (!codeVerifier) {
      console.error("No PKCE code verifier found");
      return null;
    }

    console.log("Exchanging authorization code for tokens using PKCE...");

    // Exchange authorization code for tokens
    const response = await fetch("https://login.yotoplay.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        code_verifier: codeVerifier,
        code: code,
        redirect_uri: window.location.origin,
      }),
    });

    if (response.ok) {
      const { access_token, refresh_token } = await response.json();
      storeTokens(access_token, refresh_token);

      // Clean up PKCE data
      sessionStorage.removeItem('pkce_code_verifier');

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);

      return access_token;
    } else {
      const errorText = await response.text();
      console.error("Failed to exchange code for tokens:", response.status, errorText);
      throw new Error("Failed to exchange code for tokens");
    }
  }

  return null;
};

// Login function to redirect to OAuth
const initiateLogin = async () => {
  try {
    // Generate PKCE code verifier and challenge using the npm package
    const { code_verifier, code_challenge } = await pkceChallenge();

    // Store the code verifier in session storage for the token exchange
    sessionStorage.setItem('pkce_code_verifier', code_verifier);

    const authUrl = "https://login.yotoplay.com/authorize";
    const params = new URLSearchParams({
      audience: "https://api.yotoplay.com",
      scope: "offline_access",
      response_type: "code",
      client_id: CLIENT_ID,
      code_challenge: code_challenge,
      code_challenge_method: "S256",
      redirect_uri: window.location.origin,
    });

    // Redirect user to Yoto's login page
    window.location.href = `${authUrl}?${params.toString()}`;
  } catch (error) {
    console.error("Error generating PKCE:", error);
  }
};

// Logout function
const handleLogout = () => {
  console.log("Logout clicked, clearing tokens and disconnecting MQTT...");

  // Disconnect MQTT client if connected
  if (mqttClient) {
    mqttClient.end();
    mqttClient = null;
  }

  // Clear tokens
  clearTokens();

  // Hide the app and show login message
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="container">
      <h2>Logged Out</h2>
      <p>You have been successfully logged out.</p>
      <button id="login-button">Login Again</button>
    </div>
  `;

  // Add event listener to the new login button
  document.getElementById("login-button").addEventListener("click", () => {
    location.reload();
  });
};

const start = async () => {
  const colorPicker = document.querySelector("#colorPicker");
  const debouncedSetLight = debounce(setAmbientLight, 600, { leading: true });

  // Handle OAuth callback first
  let accessToken = await handleAuthCallback();

  // If no token from callback, try to get valid stored token
  if (!accessToken) {
    accessToken = await getValidAccessToken();
  }

  // If still no token, redirect to login
  if (!accessToken) {
    console.log("No valid token found, redirecting to login...");
    initiateLogin();
    return;
  }

  // Add logout button to the UI
  const logoutButton = document.createElement("button");
  logoutButton.id = "logout-button";
  logoutButton.textContent = "Logout";
  logoutButton.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    background-color: #dc3545;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;
  logoutButton.addEventListener("click", handleLogout);
  document.body.appendChild(logoutButton);

  const deviceResponse = await fetch(
    "https://api.yotoplay.com/device-v2/devices/mine",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const { devices } = await deviceResponse.json();

  const onlineDevices = devices.filter(
    (device) => device.online && device.deviceFamily === "v3"
  );

  console.log("Available Yoto devices:");
  console.log(onlineDevices);

  if (!devices || devices.length === 0) {
    throw new Error("No Yoto devices found in your family");
  }

  if (onlineDevices.length === 0) {
    throw new Error("Your devices are offline, please turn on a v3 player");
  }

  deviceId = onlineDevices[0].deviceId;

  console.log("deviceId", deviceId);

  const clientId = `SAMPLE${deviceId}`;

  mqttClient = mqtt.connect(MQTT_URL, {
    keepalive: 300,
    port: 443,
    protocol: "wss",
    username: `${deviceId}?x-amz-customauthorizer-name=${MQTT_AUTH_NAME}`,
    password: accessToken,
    reconnectPeriod: 0,
    clientId,
    ALPNProtocols: ["x-amzn-mqtt-ca"],
  });

  colorPicker.addEventListener("input", () => {
    const color = colorPicker.value;
    debouncedSetLight(color, deviceId);
  });

  mqttClient.on("connect", () => {
    console.log("Connected to Yoto MQTT broker");

    // Subscribe to device topics for events, status, and responses
    if (deviceId) {
      const topics = [
        `device/${deviceId}/events`,
        `device/${deviceId}/status`,
        `device/${deviceId}/response`,
      ];

      topics.forEach((topic) => {
        mqttClient.subscribe(topic, (err) => {
          if (err) {
            console.error(`Failed to subscribe to ${topic}:`, err);
          } else {
            console.log(`Subscribed to ${topic}`);
          }
        });
      });

      // Request initial status update
      updateStatus();
    }
  });

  mqttClient.on("message", (topic, message) => {
    console.log(`MQTT Topic: ${topic}`);
    console.log(`MQTT Message: ${message.toString()}`);

    const [base, device, messageType] = topic.split("/");

    if (device === deviceId) {
      try {
        const payload = JSON.parse(message.toString());

        if (messageType === "events") {
          parseEventsMessage(payload);
        } else if (messageType === "status") {
          parseStatusMessage(payload);
        } else if (messageType === "response") {
          parseResponseMessage(payload);
        }
      } catch (error) {
        console.error("Error parsing MQTT message:", error);
      }
    }
  });

  mqttClient.on("error", (error) => {
    console.error("MQTT Error:", error);
  });
};

function setAmbientLight(color, deviceId) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  console.log("setting ambient light to", r, g, b, deviceId);

  if (!mqttClient) {
    console.error("Not connected to MQTT broker");
    return;
  }

  const ambientTopic = `device/${deviceId}/command/ambients`;
  const ambientPayload = { r, g, b };

  mqttClient.publish(ambientTopic, JSON.stringify(ambientPayload), (err) => {
    if (err) {
      console.error("Error setting ambient light:", err);
    } else {
      console.log("Ambient light command sent successfully", deviceId);
    }
  });
}

function updateStatus() {
  if (!mqttClient) {
    console.error("Cannot update status - not connected");
    return;
  }

  const topic = `device/${deviceId}/command/events`;
  mqttClient.publish(topic, "", (err) => {
    if (err) {
      console.error("Error requesting status update:", err);
    } else {
      console.log("Status update requested");
    }
  });
}

function parseEventsMessage(message) {
  console.log("=== EVENTS MESSAGE ===");
  console.log(message);
}

function parseStatusMessage(message) {
  console.log("=== STATUS MESSAGE ===");
  console.log(message);
}

function parseResponseMessage(message) {
  console.log("=== RESPONSE MESSAGE ===");
  console.log(message);
}

start();