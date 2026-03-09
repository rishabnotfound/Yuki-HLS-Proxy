require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 80}`;

// Get first allowed origin from .env (if set)
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
const origin = allowedOrigins.length > 0 && !allowedOrigins.includes('*') ? allowedOrigins[0] : null;

// Test HLS stream (public test stream from Mux)
const testStreamUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

// Headers to pass through (empty for public streams, add Referer/Cookie for protected ones)
const headers = {
    'Referer': 'https://example.com',
    //'Cookie': 'session=abc123',
};

const proxyUrl = `${BASE_URL}/m3u8-proxy.m3u8?url=${encodeURIComponent(encodeURIComponent(testStreamUrl))}&headers=${encodeURIComponent(JSON.stringify(headers))}`;

console.log('Testing Yuki-HLS-Proxy...');
console.log('Proxy URL:', proxyUrl);
if (origin) console.log('Using Origin:', origin);
console.log('---');

const fetchHeaders = {};
if (origin) fetchHeaders['Origin'] = origin;

fetch(proxyUrl, { headers: fetchHeaders })
    .then(res => {
        console.log('Status:', res.status);
        console.log('Content-Type:', res.headers.get('content-type'));

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        return res.text();
    })
    .then(m3u8 => {
        console.log('---');
        console.log('Proxied M3U8:');
        console.log(m3u8);

        // Verify URLs are rewritten
        const hasProxiedUrls = m3u8.includes('/m3u8-proxy.m3u8') || m3u8.includes('/ts-proxy.ts');
        console.log('---');
        console.log('URLs rewritten:', hasProxiedUrls ? 'YES' : 'NO');
    })
    .catch(err => {
        console.error('Error:', err.message);
    });
