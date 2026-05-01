# Yoto Cards List - Node.js Example

A Node.js example for the Yoto API that uses the device login flow and lists your cards.

The OAuth client must use these scopes:

- `openid`
- `offline_access`
- `family:library:view`
- `user:content:view`

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

No saved authentication found. Starting device login...

┌─────────────────────────────┬──────────────────────────────────────────────────────────────┐
│ verification_uri            │ https://login.yotoplay.com/activate                          │
├─────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ verification_uri_complete   │ https://login.yotoplay.com/activate?user_code=ABCD-EFGH      │
├─────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ user_code                   │ ABCD-EFGH                                                    │
├─────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ expires_in_minutes          │ 15                                                           │
└─────────────────────────────┴──────────────────────────────────────────────────────────────┘
```

1. Visit the verification URL
2. Enter the user code when prompted
3. Complete the authentication on your device
4. The script will automatically continue and show your cards

## Subsequent Runs

After the first authentication, the refresh token is saved locally, so subsequent runs will use the saved authentication and go straight to listing your cards.
