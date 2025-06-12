import "./style.css";
import mqtt from "mqtt";
import { webLogin } from "@yotoplay/sdk";
import debounce from "lodash.debounce";
import { jwtDecode } from "jwt-decode";

const MQTT_URL = "wss://aqrphjqbp3u2z-ats.iot.eu-west-2.amazonaws.com";
const MQTT_AUTH_NAME = "PublicJWTAuthorizer";
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
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

const start = async () => {
  const colorPicker = document.querySelector("#colorPicker");
  const debouncedSetLight = debounce(setAmbientLight, 600, { leading: true });

  const tokenResponse = await webLogin({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
  });

  if (tokenResponse) {
    const familyResponse = await fetch("https://api.yotoplay.com/user/family", {
      headers: {
        Authorization: `Bearer ${tokenResponse.accessToken}`,
      },
    });
    const { family } = await familyResponse.json();
    const { devices } = family;

    console.log("Available Yoto devices:");
    console.log(devices);

    if (!devices || devices.length === 0) {
      throw new Error("No Yoto devices found in your family");
    }

    deviceId = devices[0].deviceId;

    console.log("deviceId", deviceId);

    const clientId = `DASH${deviceId}`;

    mqttClient = mqtt.connect(MQTT_URL, {
      keepalive: 300,
      port: 443,
      protocol: "wss",
      username: `${deviceId}?x-amz-customauthorizer-name=${MQTT_AUTH_NAME}`,
      password: tokenResponse.accessToken,
      reconnectPeriod: 0,
      clientId,
      ALPNProtocols: ["x-amzn-mqtt-ca"],
    });

    colorPicker.addEventListener("input", () => {
      const color = colorPicker.value;
      debouncedSetLight(color);
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

        const topic = `device/${deviceId}/response`;

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
  }
};

function setAmbientLight(color, deviceId) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  console.log("setting ambient light to", r, g, b);

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
      console.log("Ambient light command sent successfully");
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
