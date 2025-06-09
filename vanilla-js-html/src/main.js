import { jwtDecode } from "jwt-decode";
import {
  getStoredTokens,
  storeTokens,
  clearTokens,
  refreshAccessToken,
} from "./tokens";

const clientId = import.meta.env.VITE_CLIENT_ID;
const clientSecret = import.meta.env.VITE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  throw new Error("Client ID and client secret are required");
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

const uploadToCard = async ({
  audioFile,
  title,
  accessToken,
  cardId,
  onProgress = () => {},
  apiBaseUrl = "https://api.yotoplay.com",
}) => {
  // Step 1: Get upload URL for audio with SHA256
  const uploadUrlResponse = await fetch(
    `${apiBaseUrl}/media/transcode/audio/uploadUrl`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  const {
    upload: { uploadUrl: audioUploadUrl, uploadId },
  } = await uploadUrlResponse.json();

  if (!audioUploadUrl) {
    throw new Error("Failed to get upload URL");
  }

  // Step 2: Upload the audio file
  onProgress({ stage: "uploading", progress: 0 });

  await fetch(audioUploadUrl, {
    method: "PUT",
    body: new Blob([audioFile], {
      type: audioFile.type,
      ContentDisposition: audioFile.name,
    }),
    headers: {
      "Content-Type": audioFile.type,
    },
  });

  onProgress({ stage: "transcoding", progress: 50 });

  // Step 3: Wait for transcoding (with timeout)
  let transcodedAudio = null;
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    const transcodeResponse = await fetch(
      `${apiBaseUrl}/media/upload/${uploadId}/transcoded?loudnorm=false`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (transcodeResponse.ok) {
      const data = await transcodeResponse.json();
      console.log(data);
      if (data.transcode.transcodedSha256) {
        console.log("Transcoded audio:", data.transcode);
        transcodedAudio = data.transcode;
        break;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
    attempts++;
    onProgress({
      stage: "transcoding",
      progress: 50 + (attempts / maxAttempts) * 25,
    });
  }

  if (!transcodedAudio) {
    throw new Error("Transcoding timed out");
  }

  // Get media info from the transcoded audio
  const mediaInfo = transcodedAudio.transcodedInfo;

  console.log("Media info:", mediaInfo);

  // Step 4: First get the existing card to update
  onProgress({ stage: "updating_card", progress: 85 });

  const cardResponse = await fetch(`${apiBaseUrl}/content/${cardId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!cardResponse.ok) {
    throw new Error("Failed to fetch card");
  }

  const { card: existingCard } = await cardResponse.json();

  console.log("Existing card:", existingCard);

  const chapterTitle = mediaInfo?.metadata?.title || existingCard.title;

  const chapters = [
    {
      key: "01",
      title: chapterTitle,
      overlayLabel: "1",
      tracks: [
        {
          key: "01",
          title: chapterTitle,
          trackUrl: `yoto:#${transcodedAudio.transcodedSha256}`,
          duration: mediaInfo?.duration,
          fileSize: mediaInfo?.fileSize,
          channels: mediaInfo?.channels,
          format: mediaInfo?.format,
          type: "audio",
          overlayLabel: "1",
        },
      ],
      display: {
        icon16x16: "yoto:#aUm9i3ex3qqAMYBv-i-O-pYMKuMJGICtR3Vhf289u2Q",
      },
    },
  ];

  // Set up chapters
  existingCard.content.chapters = chapters;
  existingCard.title = title;

  // Update metadata
  if (!existingCard.metadata) existingCard.metadata = {};
  if (!existingCard.metadata.media) existingCard.metadata.media = {};

  existingCard.metadata.media.duration = mediaInfo?.duration;
  existingCard.metadata.media.fileSize = mediaInfo?.fileSize;
  existingCard.metadata.media.readableFileSize =
    Math.round((mediaInfo?.fileSize / 1024 / 1024) * 10) / 10;
  existingCard.metadata.media.hasStreams = false;

  console.log("Updating card data:", existingCard);

  // Step 5: Update the card
  const updateCardResponse = await fetch(`${apiBaseUrl}/content`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(existingCard),
  });

  if (!updateCardResponse.ok) {
    const errorText = await updateCardResponse.text();
    throw new Error(`Failed to update card: ${errorText}`);
  }

  onProgress({ stage: "complete", progress: 100 });

  return await updateCardResponse.json();
};

// login button click events
const loginButton = document.getElementById("login-button");
loginButton.addEventListener("click", () => {
  const authUrl = "https://login.yotoplay.com/authorize";
  const params = new URLSearchParams({
    audience: "https://api.yotoplay.com",
    scope: "offline_access",
    response_type: "code",
    client_id: clientId,
    redirect_uri: window.location.origin,
  });

  // Redirect user to Yoto's login page
  window.location.href = `${authUrl}?${params.toString()}`;
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

  if (code) {
    // Exchange authorization code for tokens
    const response = await fetch("https://login.yotoplay.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: window.location.origin,
      }),
    });

    if (response.ok) {
      const { access_token, refresh_token } = await response.json();
      storeTokens(access_token, refresh_token);

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Show upload form
      showUploadForm();
    } else {
      console.error("Failed to exchange code for tokens");
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
