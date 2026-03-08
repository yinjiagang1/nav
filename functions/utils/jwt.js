/**
 * Base64 Encoding/Decoding utilities for JWT
 */
export function base64UrlEncode(str) {
    const base64 = btoa(str);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
        str += '=';
    }
    return atob(str);
}

/**
 * Generate a JWT token
 */
export async function signJWT(payload, secret) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const data = `${encodedHeader}.${encodedPayload}`;

    const encoder = new TextEncoder();
    const keyInfo = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', keyInfo, encoder.encode(data));
    const signature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signatureBuffer)));

    return `${data}.${signature}`;
}

/**
 * Verify a JWT token
 */
export async function verifyJWT(token, secret) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;

        const [encodedHeader, encodedPayload, signature] = parts;
        const data = `${encodedHeader}.${encodedPayload}`;

        const encoder = new TextEncoder();
        const keyInfo = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        // Decode base64url to Uint8Array for verification
        const sigStr = atob(signature.replace(/-/g, '+').replace(/_/g, '/'));
        const sigBuf = new Uint8Array(sigStr.length);
        for (let i = 0; i < sigStr.length; i++) {
            sigBuf[i] = sigStr.charCodeAt(i);
        }

        const isValid = await crypto.subtle.verify('HMAC', keyInfo, sigBuf, encoder.encode(data));
        if (!isValid) return false;

        const payload = JSON.parse(base64UrlDecode(encodedPayload));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return false; // Expired
        }
        return payload;
    } catch (err) {
        return false;
    }
}
