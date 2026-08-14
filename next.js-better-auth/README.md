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

## Run

```sh
npm install
npm run dev
```
