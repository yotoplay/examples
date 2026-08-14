# Yoto Card Alarm Example

Schedule a specific Yoto card as an alarm on a player. Other settings and existing alarms are preserved.

This works by sending a `PUT` request to `/device-v2/{deviceId}/config` to replace the full config block. This example fetches the current block first, appends the alarm, and sends the merged block back.

The OAuth client needs these scopes:

- `offline_access`
- `family:devices:view`
- `family:devices:manage`
- `user:content:view`

It must allow this callback URL:

```text
http://127.0.0.1:8787/callback
```

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set the client ID:

   ```text
   YOTO_CLIENT_ID=your_client_id
   ```

3. Set the alarm details in `index.js`:

   ```js
   const alarm = {
     deviceId: "your_player_device_id",
     cardId: "your_five_character_card_id",
     time: "0730",
     days: "1111100",
     volume: 5,
   };
   ```

`days` is a numerical pattern of `1`s and `0`s ordered Monday through Sunday. `1` includes the day and `0` excludes it. 

`1111100` means weekdays, `0000011` means weekends, and `1111111` means every day. The time uses 24-hour `HHMM` format in the player's configured timezone. Keep the volume at `8` or lower.

## Usage

Preview the alarm without changing the player:

```bash
node index.js
```

Create the alarm:

```bash
node index.js --write
```

On the first run, open the printed authorization URL and complete login. The refresh token is then saved locally for subsequent runs.

## Alarm format

The device config API stores each alarm as a comma-separated string:

```text
<day pattern>,<HHMM>,<cardId>,,,<volume>,<enabled>
```

For example, this plays card `6Mq8g` at 07:30 every weekday at volume 5:

```text
1111100,0730,6Mq8g,,,5,1
```
