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
          discoveryUrl: 'https://login.yotoplay.com/.well-known/openid-configuration',
          clientId: process.env.YOTO_CLIENT_ID!,
          clientSecret: process.env.YOTO_CLIENT_SECRET!,
          scopes: [
            'openid',
            'profile',
            'email',
            'offline_access',
            'user:content:view',
          ],
          authorizationUrlParams: {
            audience: 'https://api.yotoplay.com'
          },
          tokenUrlParams: {
            audience: 'https://api.yotoplay.com'
          }
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
