import { Handler } from "@netlify/functions";
import { getSatelliteData } from "../src/satellite-data";
import { textToSpeech } from "../src/elevenlabs";

export const handler: Handler = async () => {
  const satelliteData = await getSatelliteData("49044");

  let text = `The International Space Station is currently at the following coordinates: 
  ${satelliteData.latitude} latitude, ${satelliteData.longitude} longitude.`;

  text += `This is powered by live data from NASA's API.`;

  console.log(text);

  return await textToSpeech(text);
};
