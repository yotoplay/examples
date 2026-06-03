# Yoto Cards List - Node.js Example

A Node.js example for the Yoto API that uses browser login with a loopback callback and lists your cards.

The OAuth client must use these scopes:

- `offline_access`
- `family:library:view`
- `user:content:view`

The OAuth client must allow this callback URL:

```text
http://127.0.0.1:8787/callback
```

## Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Create a .env file**:
   ```bash
   cp .env.example .env
   ```

   Set `YOTO_CLIENT_ID` to a client ID for an app configured with the scopes above, including `offline_access`.

## Usage

Run the example:

```bash
npm start
```

## First Run

On your first run, you'll see something like:

```
=========================

No saved authentication found. Starting browser login...

Before continuing, make sure this callback URL is allowed in your Yoto app:
http://127.0.0.1:8787/callback

Open this URL in your browser to authenticate:
https://login.yotoplay.com/authorize?client_id=...

Waiting for the redirect on http://127.0.0.1:8787/callback ...
```

1. Open the authorization URL
2. Complete authentication in your browser
3. The browser redirects to the local callback
4. The script exchanges the authorization code and shows your cards

## Subsequent Runs

After the first authentication, the refresh token is saved locally, so subsequent runs will use the saved authentication and go straight to listing your cards.
