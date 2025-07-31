import { PassThrough } from "stream";

const streamToBuffer = async (
  stream: NodeJS.ReadableStream
): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", (err) => reject(err));
  });
};

export const textToSpeech = async (
  text: string,
  voiceId?: string,
  modelId?: string,
  outputFormat?: string,
  languageCode?: string
) => {
  if (!text) throw new Error("Text parameter is required");
  if (!process.env.ELEVENLABS_API_KEY)
    throw new Error("ELEVENLABS_API_KEY environment variable is required");

  const voice_id = voiceId || "fNYuJl2dBlX9V7NxmjnV"; // Ned
  const model_id = modelId || "eleven_turbo_v2_5";
  const output_format = outputFormat || "mp3_22050_32";

  const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`;

  const response = await fetch(elevenLabsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id,
      output_format,
      ...(languageCode && { language_code: languageCode }),
    }),
  });

  if (!response.body) {
    throw new Error("No response body received");
  }

  const audioStream = new PassThrough();
  await response.body.pipeTo(
    new WritableStream({
      write(chunk) {
        audioStream.write(chunk);
      },
      close() {
        audioStream.end();
      },
    })
  );

  const audioBuffer = await streamToBuffer(audioStream);
  const base64Audio = audioBuffer.toString("base64");

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "audio/mpeg",
    },
    body: base64Audio,
    isBase64Encoded: true,
  };
};
