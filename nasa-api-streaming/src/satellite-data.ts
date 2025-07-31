import satellite from "satellite.js";

export async function getSatelliteData(satelliteNumber = "49044") {
  // This looks like a personal website
  // but it's the link given by the official NASA docs https://api.nasa.gov/
  const response = await fetch(
    "https://tle.ivanstanojevic.me/api/tle/" + satelliteNumber
  );
  const tle = await response.json();
  const tleLine1 = tle.line1;
  const tleLine2 = tle.line2;

  const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
  const now = new Date();
  const positionAndVelocity = satellite.propagate(satrec, now);

  const gmst = satellite.gstime(now);
  const positionGd = satellite.eciToGeodetic(
    positionAndVelocity.position,
    gmst
  );

  const latitude =
    Math.round(satellite.degreesLat(positionGd.latitude) * 10000) / 10000;
  const longitude =
    Math.round(satellite.degreesLong(positionGd.longitude) * 10000) / 10000;

  return {
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
  };
}
