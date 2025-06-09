# Yoto React Example App

The react compilation is provided by [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) which uses [SWC](https://swc.rs/).

## Getting Started

1. Copy the example environment file and fill in your Yoto API credentials:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` with your Client ID and Client Secret:

   ```
   VITE_YOTO_CLIENT_ID=your_client_id_here
   VITE_YOTO_CLIENT_SECRET=your_client_secret_here
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```
