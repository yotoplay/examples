# Yoto Cards List - Vanilla Node.js Example

A vanilla Node.js example for the Yoto API that uses device login flow and lists your cards

## Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Create a .env file**:
   ```bash
   echo "YOTO_CLIENT_ID=your_client_id_here" > .env
   ```

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
│ expires_in_minutes          │ 5                                                            │
└─────────────────────────────┴──────────────────────────────────────────────────────────────┘
```

1. Visit the verification URL or scan the QR code (if you have one)
2. Enter the user code when prompted
3. Complete the authentication on your device
4. The script will automatically continue and show your cards

## Subsequent Runs

After the first authentication, the refresh token is saved locally, so subsequent runs will use the saved authentication and go straight to listing your cards.
