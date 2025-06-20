import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
    server: {
        port: 3001,
        strictPort: true, // This will fail if port 3001 is already in use
    },
}) 