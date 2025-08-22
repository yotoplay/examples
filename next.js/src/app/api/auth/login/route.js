// Confidential Client OAuth Flow - Login Endpoint

export async function GET() {
  // Step 1: Build authorization URL for confidential client
  const authUrl = "https://login.yotoplay.com/authorize";
  const params = new URLSearchParams({
    audience: "https://api.yotoplay.com",
    scope: "offline_access",
    response_type: "code",
    client_id: process.env.YOTO_CLIENT_ID,
    redirect_uri: "http://localhost:3000/api/auth/callback",
  });
  // Redirect user to Yoto's login page
  return Response.redirect(`${authUrl}?${params.toString()}`);
}
