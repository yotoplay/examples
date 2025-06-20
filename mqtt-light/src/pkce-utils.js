// Generate a random string for PKCE
export function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// Generate PKCE code verifier and challenge
export function generatePKCE() {
    const codeVerifier = generateRandomString(128);

    // Create SHA256 hash of the code verifier
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);

    return crypto.subtle.digest('SHA-256', data).then(hash => {
        const hashArray = Array.from(new Uint8Array(hash));
        const hashString = String.fromCharCode.apply(null, hashArray);
        const codeChallenge = btoa(hashString)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        return { codeVerifier, codeChallenge };
    });
} 