# Yoto Next.js Example App

A Next.js example app for the Yoto API that demonstrates server-side/confidential OAuth authentication and fetching your Yoto cards.

## Getting Started

1. Copy the example environment file and fill in your Yoto API credentials:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` with your credentials:

   ```
   YOTO_CLIENT_ID=your_client_id_here
   YOTO_CLIENT_SECRET=your_client_secret_here
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

## Features

- Server-side OAuth authentication flow
- Secure token storage using configstore
- Displays your Yoto cards after login
- Login/logout functionality
