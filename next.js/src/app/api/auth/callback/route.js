// Confidential Client OAuth Flow - Callback Endpoint
import Configstore from "configstore";

const config = new Configstore("yoto-nextjs-tokens");

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const authCode = searchParams.get("code");
  const state = searchParams.get("state");

  if (!authCode) {
    return new Response("Missing authorization code", { status: 400 });
  }

  try {
    // Step 3: Exchange authorization code for tokens
    // We must include the client_secret (and don't need PKCE)
    const tokenResponse = await fetch(
      "https://login.yotoplay.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: process.env.YOTO_CLIENT_ID,

          // 🔑 CONFIDENTIAL CLIENT: Uses secret instead of PKCE
          client_secret: process.env.YOTO_CLIENT_SECRET,

          code: authCode,
          redirect_uri: "http://localhost:3000/api/auth/callback",
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(
        `Token exchange failed: ${tokenResponse.status} - ${errorText}`
      );
    }

    const tokens = await tokenResponse.json();

    // tokens will contain:
    // - access_token: For calling APIs
    // - id_token: User information (JWT)
    // - refresh_token: For getting new access tokens
    // - expires_in: Token lifetime

    // Store tokens using configstore
    storeTokens(tokens.access_token, tokens.refresh_token);

    // Redirect to main page
    const url = new URL(request.url);
    return Response.redirect(new URL("/", url.origin));
  } catch (error) {
    console.error("Auth callback error:", error);
    const url = new URL(request.url);
    return Response.redirect(new URL("/login?error=auth_failed", url.origin));
  }
}

// Persistent token storage using configstore
function storeTokens(accessToken, refreshToken) {
  config.set("tokens", {
    accessToken,
    refreshToken,
  });
}

// Export function to get stored tokens
export function getStoredTokens() {
  return config.get("tokens");
}
