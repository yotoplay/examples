# Next.js Better Auth

This template uses the same Yoto OAuth configuration as `interactive-card-preview`.

## Environment

1. Create `.env.local` with:

```sh
BETTER_AUTH_SECRET=
YOTO_CLIENT_ID=
YOTO_CLIENT_SECRET=
```

2. Generate `BETTER_AUTH_SECRET` using the [Better Auth installation guide](https://better-auth.com/docs/installation).

3. Configure this callback URL in the Yoto Auth0 client:

```text
http://localhost:3000/api/auth/oauth2/callback/yoto
```

Add the corresponding production callback URL before deploying.

## Notes on the OAuth config

Due to the way our upstream provider is setup, we don't serve the standard `openid`/`profile`/`email` scopes or the
native `/userinfo` endpoint to 3rd party clients. So this example:

- Requests `user:profile:view`/`user:email:view` instead of `profile`/`email`, and points
  `userInfoUrl` at Yoto's own `/user/info` endpoint instead of relying on OIDC discovery.
- Sets `pkce: true` — strict mode requires PKCE for every third-party client, including
  confidential/server-side ones like this one.

If you're integrating with a different OAuth/OIDC library, the same three adjustments apply:
request our own profile/email scopes, point your userinfo call at our own `/user/info` endpoint
, and enable PKCE explicitly if your library doesn't do so by
default.

## Run

```sh
npm install
npm run dev
```
