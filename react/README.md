# Yoto React Example App

This example uses [@vitejs/plugin-react](https://www.npmjs.com/package/@vitejs/plugin-react) with Vite.

## Getting Started

1. Copy the example environment file and fill in your Yoto API credentials:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` with your Client ID:

   ```
   VITE_CLIENT_ID=your_client_id_here
   ```

   **Note**: This app uses PKCE (Proof Key for Code Exchange) for security, so no client secret is needed!

2. In your Yoto application settings in the dashboard, add this allowed callback URL:

   ```
   http://localhost:3000
   ```

3. This example requests these scopes during login:

   ```
   openid family:library:view user:content:view
   ```

   Add `offline_access` only if that scope has been pre-approved for your client.

4. Install dependencies:

   ```bash
   npm install
   ```

5. Start the development server:
   ```bash
   npm start
   ```

## Authentication Flow

This app implements a secure, persistent authentication flow:

### Initial Login
- Uses PKCE (Proof Key for Code Exchange) for the first login
- No client secret required - more secure for client-side apps
- Gets both access token and refresh token

### Persistent Login
- Uses refresh tokens for subsequent logins
- Automatically refreshes expired access tokens
- Only redirects to login when refresh token is invalid/expired

### Security Features
- PKCE for initial authentication (no client secret exposure)
- Automatic token refresh
- Secure token storage in localStorage
- Proper error handling and logout functionality

## Routes

- `/` - Authentication check and redirect
- `/login` - Login page with PKCE flow
- `/app` - Main application (requires authentication)
