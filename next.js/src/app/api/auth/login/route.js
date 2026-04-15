// Confidential Client OAuth Flow - Login Endpoint

const scopes = [
  "offline_access",
  "family:library:view",
  "user:content:view",
].join(" ");

export async function GET() {
  if (!process.env.YOTO_CLIENT_ID) {
    throw new Error("YOTO_CLIENT_ID is required");
  }

  // Step 1: Build authorization URL for confidential client
  const authUrl = "https://login.yotoplay.com/authorize";
  const params = new URLSearchParams({
    audience: "https://api.yotoplay.com",
    scope: scopes,
    response_type: "code",
    client_id: process.env.YOTO_CLIENT_ID,
    redirect_uri: "http://localhost:3000/api/auth/callback",
  });
  // Redirect user to Yoto's login page
  return Response.redirect(`${authUrl}?${params.toString()}`);
}
