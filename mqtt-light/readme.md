# MQTT Light Example

A vanilla JavaScript example that connects to your Yoto device via MQTT and allows you to control the ambient light.

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

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

   The app will run on `http://localhost:3001`

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

## Features

- **Color Control**: Change the ambient light color of your Yoto device
- **MQTT Connection**: Real-time communication with your device
- **Logout**: Secure logout with token cleanup and MQTT disconnection
