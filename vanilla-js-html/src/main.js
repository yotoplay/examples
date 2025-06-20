import { jwtDecode } from "jwt-decode";
import {
  getStoredTokens,
  storeTokens,
  clearTokens,
  refreshAccessToken,
} from "./tokens";
import { uploadToCard } from "./upload";
import { generatePKCE } from "./pkce-utils";

const clientId = import.meta.env.VITE_CLIENT_ID;

if (!clientId) {
  throw new Error("Client ID is required");
}

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

// login button click events
const loginButton = document.getElementById("login-button");
loginButton.addEventListener("click", async () => {
  try {
    // Generate PKCE code verifier and challenge
    const { codeVerifier, codeChallenge } = await generatePKCE();

    // Store the code verifier in session storage for the token exchange
    sessionStorage.setItem('pkce_code_verifier', codeVerifier);

    const authUrl = "https://login.yotoplay.com/authorize";
    const params = new URLSearchParams({
      audience: "https://api.yotoplay.com",
      scope: "offline_access",
      response_type: "code",
      client_id: clientId,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      redirect_uri: window.location.origin,
    });

    // Redirect user to Yoto's login page
    window.location.href = `${authUrl}?${params.toString()}`;
  } catch (error) {
    console.error("Error generating PKCE:", error);
  }
});

const updateCardsList = async () => {
  const cardsDropdown = document.getElementById("cards-dropdown");
  cardsDropdown.innerHTML = '<option value="" disabled>Loading...</option>';

  // Get valid access token
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    cardsDropdown.innerHTML =
      '<option value="" disabled>Authentication expired</option>';
    return;
  }

  const response = await fetch("https://api.yotoplay.com/card/mine", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    console.error("Failed to fetch cards:", response.statusText);
    cardsDropdown.innerHTML =
      '<option value="" disabled>Failed to load cards</option>';
    return;
  }

  const { cards } = await response.json();

  console.log("Cards:", cards);

  // Fetch detailed card data for each card
  const detailedCards = await Promise.all(
    cards.map(async (card) => {
      const cardResponse = await fetch(
        `https://api.yotoplay.com/content/${card.cardId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!cardResponse.ok) {
        console.warn(`Failed to fetch details for card ${card.cardId}`);
        return card;
      }
      const cardData = await cardResponse.json();
      return cardData.card;
    })
  );

  console.log("Detailed cards:", detailedCards);

  if (cards.length === 0) {
    cardsDropdown.innerHTML =
      '<option value="" disabled>No cards found</option>';
    return;
  }

  cardsDropdown.innerHTML = detailedCards
    .map(
      (card) =>
        `<option value="${card.cardId}">${card.cardId} - ${card.title}</option>`
    )
    .join("");
};

// Handle callback
const start = async () => {
  // Check if we have an authorization code (we've just been redirected from Yoto's login page)
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const error = params.get("error");

  if (error) {
    console.error("Authorization error:", error);
    return;
  }

  if (code) {
    // Get the stored code verifier
    const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
    if (!codeVerifier) {
      console.error("No PKCE code verifier found");
      return;
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
        client_id: clientId,
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

      // Show upload form
      showUploadForm();
    } else {
      const errorText = await response.text();
      console.error("Failed to exchange code for tokens:", response.status, errorText);
    }
  } else {
    // Check if we have stored tokens
    const accessToken = await getValidAccessToken();
    if (accessToken) {
      showUploadForm();
    }
  }
};

const showUploadForm = async () => {
  // Hide login button and show upload form
  loginButton.style.display = "none";
  const formContainer = document.querySelector(".upload-form-container");
  formContainer.style.display = "block";

  // Load initial cards list
  await updateCardsList();

  // Setup upload functionality
  const uploadForm = document.getElementById("upload-form");
  const progressDiv = document.getElementById("upload-progress");

  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const cardId = document.getElementById("cards-dropdown").value;
    const audioFile = document.getElementById("audio-file").files[0];
    const title = document.getElementById("title").value;

    console.log("Uploading card:", cardId);

    // Get token before upload
    const validAccessToken = await getValidAccessToken();
    if (!validAccessToken) {
      alert("Session expired, please log in again");
      clearTokens();
      location.reload();
      return;
    }

    const result = await uploadToCard({
      audioFile,
      title,
      accessToken: validAccessToken,
      cardId,
      onProgress: ({ stage, progress, error }) => {
        if (error) {
          console.error("Upload error:", error);
          progressDiv.textContent = "Upload failed";
        } else {
          progressDiv.textContent = `${stage}: ${progress}%`;
        }
      },
    });

    if (result) {
      console.log("Card updated:", result);
      uploadForm.reset();
      progressDiv.textContent = "";
      updateCardsList();
    }
  });
};

// start the app
start();
