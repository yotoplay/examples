import Configstore from "configstore";

const config = new Configstore("yoto-nextjs-tokens");

export async function POST() {
  try {
    // Clear the stored tokens
    config.delete("tokens");

    // Redirect to home page
    return Response.redirect(new URL("/", "http://localhost:3000"));
  } catch (error) {
    console.error("Logout error:", error);
    return new Response("Logout failed", { status: 500 });
  }
}
