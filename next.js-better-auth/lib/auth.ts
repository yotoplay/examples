import { betterAuth } from 'better-auth/minimal';
import { genericOAuth } from 'better-auth/plugins/generic-oauth';
import { nextCookies } from 'better-auth/next-js';
import { headers } from 'next/headers';

const yotoProviderId = 'yoto';

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET!,
  baseURL: {
    allowedHosts: ['localhost:3000', '*.netlify.app']
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: yotoProviderId,
          // Not using `discoveryUrl` deliberately: better-auth's genericOAuth plugin
          // unconditionally overwrites `userInfoUrl` with the discovery document's
          // `userinfo_endpoint` whenever `discoveryUrl` is set, which would silently undo the
          // override below. Auth0's native `/userinfo` also isn't available to strict-mode
          // third-party clients at all, so discovery can't be used here regardless.
          authorizationUrl: 'https://login.yotoplay.com/authorize',
          tokenUrl: 'https://login.yotoplay.com/oauth/token',
          clientId: process.env.YOTO_CLIENT_ID!,
          clientSecret: process.env.YOTO_CLIENT_SECRET!,
          // Strict-mode third-party clients require PKCE unconditionally, including
          // confidential/server-side clients like this one - not just public/SPA clients.
          pkce: true,
          scopes: [
            'openid',
            'offline_access',
            'user:content:view',
            'user:profile:view',
            'user:email:view',
          ],
          authorizationUrlParams: {
            audience: 'https://api.yotoplay.com'
          },
          tokenUrlParams: {
            audience: 'https://api.yotoplay.com'
          },
          userInfoUrl: 'https://api.yotoplay.com/user/userinfo'
        }
      ]
    }),
    nextCookies()
  ]
});

export async function getSession() {
  return auth.api.getSession({
    headers: await headers()
  });
}

export async function getYotoAccessToken() {
  const requestHeaders = await headers();

  const token = await auth.api
    .getAccessToken({
      body: {
        providerId: yotoProviderId
      },
      headers: requestHeaders
    })
    .catch((error) => {
      console.error('Failed to fetch Yoto access token', error);
      return null;
    });

  if (!token?.accessToken) {
    return null;
  }

  return token.accessToken;
}
