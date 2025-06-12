export const uploadToCard = async ({
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
