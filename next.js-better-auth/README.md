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

This app is a third-party client, and Auth0's "strict" third-party security mode (which Yoto
uses) doesn't issue an ID token or serve the standard `openid`/`profile`/`email` scopes or the
native `/userinfo` endpoint to third-party clients. So this example:

- Requests `user:profile:view`/`user:email:view` instead of `profile`/`email`, and points
  `userInfoUrl` at Yoto's own `/userinfo` endpoint instead of relying on OIDC discovery.
- Sets `authorizationUrl`/`tokenUrl` explicitly rather than using `discoveryUrl` — `better-auth`'s
  `genericOAuth` plugin overwrites an explicit `userInfoUrl` with whatever the discovery
  document's `userinfo_endpoint` says whenever `discoveryUrl` is set, which would silently undo
  the point above.
- Sets `pkce: true` — strict mode requires PKCE for every third-party client, including
  confidential/server-side ones like this one.

If you're integrating with a different OAuth/OIDC library, the same three adjustments apply:
request Yoto's own profile/email scopes, point your userinfo call at Yoto's `/userinfo` endpoint
instead of relying on discovery, and enable PKCE explicitly if your library doesn't do so by
default for confidential clients.

## Run

```sh
npm install
npm run dev
```
