import { BASE_PATH, allowedOrigins, allowAll } from "../utils/utils";
import type { Request, Response } from "express";

/**
 * Resolves a URL against a base URL, handling both absolute and relative URLs
 */
function resolveUrl(url: string, base: string): string {
    if (!url || url.trim() === '') return url;

    // Already absolute
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // Protocol-relative
    if (url.startsWith('//')) {
        return 'https:' + url;
    }

    // Absolute path from root
    if (url.startsWith('/')) {
        try {
            const baseUrl = new URL(base);
            return `${baseUrl.protocol}//${baseUrl.host}${url}`;
        } catch {
            return base + url;
        }
    }

    // Relative path
    return base + '/' + url;
}

/**
 * Creates a proxied URL for m3u8 playlists
 */
function proxyM3u8Url(url: string, base: string, headers: string): string {
    const fullUrl = resolveUrl(url, base);
    return `${BASE_PATH}/m3u8-proxy.m3u8?url=${encodeURIComponent(encodeURIComponent(fullUrl))}&headers=${headers}`;
}

/**
 * Creates a proxied URL for segments (ts, mp4, cmf, etc.)
 */
function proxySegmentUrl(url: string, base: string, headers: string): string {
    const fullUrl = resolveUrl(url, base);
    return `${BASE_PATH}/ts-proxy.ts?url=${encodeURIComponent(encodeURIComponent(fullUrl))}&headers=${headers}`;
}

/**
 * Replaces a URI attribute in a tag line
 */
function replaceUriAttribute(line: string, proxyFn: (uri: string) => string): string {
    const match = line.match(/URI="([^"]+)"/);
    if (match) {
        const originalUri = match[1];
        const proxiedUri = proxyFn(originalUri);
        return line.replace(`URI="${originalUri}"`, `URI="${proxiedUri}"`);
    }
    return line;
}

/**
 * Processes an HLS manifest line and returns the modified line
 */
function processLine(
    line: string,
    base: string,
    headers: string
): { line: string; skipNext: boolean } {
    const trimmed = line.trim();

    // Skip empty lines and comments (except HLS tags)
    if (trimmed === '' || (trimmed.startsWith('#') && !trimmed.startsWith('#EXT'))) {
        return { line, skipNext: false };
    }

    // Master playlist: variant streams
    if (trimmed.startsWith('#EXT-X-STREAM-INF')) {
        return { line, skipNext: false }; // URL is on next line, handled separately
    }

    // Master playlist: I-frame streams (inline URI)
    if (trimmed.startsWith('#EXT-X-I-FRAME-STREAM-INF')) {
        return {
            line: replaceUriAttribute(line, (uri) => proxyM3u8Url(uri, base, headers)),
            skipNext: false
        };
    }

    // Media playlist: encryption keys (AES-128, SAMPLE-AES)
    if (trimmed.startsWith('#EXT-X-KEY')) {
        // Don't proxy NONE method
        if (trimmed.includes('METHOD=NONE')) {
            return { line, skipNext: false };
        }
        return {
            line: replaceUriAttribute(line, (uri) => proxySegmentUrl(uri, base, headers)),
            skipNext: false
        };
    }

    // Session keys (master playlist level encryption)
    if (trimmed.startsWith('#EXT-X-SESSION-KEY')) {
        if (trimmed.includes('METHOD=NONE')) {
            return { line, skipNext: false };
        }
        return {
            line: replaceUriAttribute(line, (uri) => proxySegmentUrl(uri, base, headers)),
            skipNext: false
        };
    }

    // Initialization segment (fMP4)
    if (trimmed.startsWith('#EXT-X-MAP')) {
        return {
            line: replaceUriAttribute(line, (uri) => proxySegmentUrl(uri, base, headers)),
            skipNext: false
        };
    }

    // Alternate renditions (audio, subtitles, etc.)
    if (trimmed.startsWith('#EXT-X-MEDIA')) {
        if (trimmed.includes('URI="')) {
            return {
                line: replaceUriAttribute(line, (uri) => proxyM3u8Url(uri, base, headers)),
                skipNext: false
            };
        }
        return { line, skipNext: false };
    }

    // Session data (can have URI attribute)
    if (trimmed.startsWith('#EXT-X-SESSION-DATA')) {
        if (trimmed.includes('URI="')) {
            return {
                line: replaceUriAttribute(line, (uri) => proxySegmentUrl(uri, base, headers)),
                skipNext: false
            };
        }
        return { line, skipNext: false };
    }

    // Low-Latency HLS: Partial segments
    if (trimmed.startsWith('#EXT-X-PART:')) {
        return {
            line: replaceUriAttribute(line, (uri) => proxySegmentUrl(uri, base, headers)),
            skipNext: false
        };
    }

    // Low-Latency HLS: Preload hints
    if (trimmed.startsWith('#EXT-X-PRELOAD-HINT')) {
        return {
            line: replaceUriAttribute(line, (uri) => proxySegmentUrl(uri, base, headers)),
            skipNext: false
        };
    }

    // Low-Latency HLS: Rendition reports
    if (trimmed.startsWith('#EXT-X-RENDITION-REPORT')) {
        return {
            line: replaceUriAttribute(line, (uri) => proxyM3u8Url(uri, base, headers)),
            skipNext: false
        };
    }

    // Date range with asset URI
    if (trimmed.startsWith('#EXT-X-DATERANGE')) {
        if (trimmed.includes('X-ASSET-URI="')) {
            const match = line.match(/X-ASSET-URI="([^"]+)"/);
            if (match) {
                const originalUri = match[1];
                const proxiedUri = proxySegmentUrl(originalUri, base, headers);
                return {
                    line: line.replace(`X-ASSET-URI="${originalUri}"`, `X-ASSET-URI="${proxiedUri}"`),
                    skipNext: false
                };
            }
        }
        return { line, skipNext: false };
    }

    // Start tag (no URL)
    if (trimmed.startsWith('#EXT-X-START')) {
        return { line, skipNext: false };
    }

    // Image stream (for trick play thumbnails)
    if (trimmed.startsWith('#EXT-X-IMAGE-STREAM-INF')) {
        return {
            line: replaceUriAttribute(line, (uri) => proxyM3u8Url(uri, base, headers)),
            skipNext: false
        };
    }

    // Tiles (thumbnail images)
    if (trimmed.startsWith('#EXT-X-TILES')) {
        return {
            line: replaceUriAttribute(line, (uri) => proxySegmentUrl(uri, base, headers)),
            skipNext: false
        };
    }

    // Gap tag (no URL)
    if (trimmed.startsWith('#EXT-X-GAP')) {
        return { line, skipNext: false };
    }

    // Bitrate tag (no URL)
    if (trimmed.startsWith('#EXT-X-BITRATE')) {
        return { line, skipNext: false };
    }

    return { line, skipNext: false };
}

export default async function m3u8(req: Request, res: Response) {
    try {
        const origin = req.headers.origin;

        // Check if origin is allowed
        if (!allowAll) {
            if (!origin || !allowedOrigins.includes(origin)) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }
        }

        if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        } else if (allowAll) {
            res.setHeader('Access-Control-Allow-Origin', '*');
        }

        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400');

        const url = decodeURIComponent(req.query.url as string);
        let headers: string = decodeURIComponent(req.query.headers as string);
        let h = JSON.parse(headers);
        const hString = encodeURIComponent(JSON.stringify(h));

        if (typeof url !== 'string' || !url) {
            res.status(400).json({ error: 'Invalid URL parameter' });
            return;
        }

        // Extract base URL for resolving relative paths
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        pathParts.pop(); // Remove filename
        const base = `${urlObj.protocol}//${urlObj.host}${pathParts.join('/')}`;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000);

            const r = await fetch(url, {
                headers: h,
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!r.ok) {
                res.status(r.status).json({ error: `Upstream returned ${r.status}` });
                return;
            }

            const data = await r.text();
            const lines = data.split('\n');
            const result: string[] = [];

            let i = 0;
            while (i < lines.length) {
                const line = lines[i];
                const trimmed = line.trim();

                // Handle tags where URL is on the next line
                if (trimmed.startsWith('#EXT-X-STREAM-INF') || trimmed.includes('BANDWIDTH')) {
                    // Master playlist variant - URL on next line
                    result.push(line);
                    i++;
                    if (i < lines.length) {
                        const urlLine = lines[i].trim();
                        if (urlLine && !urlLine.startsWith('#')) {
                            result.push(proxyM3u8Url(urlLine, base, hString));
                        } else {
                            result.push(lines[i]);
                        }
                    }
                    i++;
                    continue;
                }

                if (trimmed.startsWith('#EXTINF')) {
                    // Media segment - URL on next line
                    result.push(line);
                    i++;
                    if (i < lines.length) {
                        const urlLine = lines[i].trim();
                        if (urlLine && !urlLine.startsWith('#')) {
                            result.push(proxySegmentUrl(urlLine, base, hString));
                        } else {
                            result.push(lines[i]);
                        }
                    }
                    i++;
                    continue;
                }

                if (trimmed.startsWith('#EXT-X-BYTERANGE') && !trimmed.includes('@')) {
                    // Byte range for previous segment - URL might be on next line
                    result.push(line);
                    i++;
                    if (i < lines.length) {
                        const nextLine = lines[i].trim();
                        if (nextLine && !nextLine.startsWith('#')) {
                            result.push(proxySegmentUrl(nextLine, base, hString));
                            i++;
                        }
                    }
                    continue;
                }

                // Process inline URL tags
                const { line: processedLine } = processLine(line, base, hString);
                result.push(processedLine);
                i++;
            }

            const joined = result.join('\n');
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.status(200).send(joined);

        } catch (error: any) {
            if (error.name === 'AbortError') {
                res.status(504).json({ error: 'Upstream timeout' });
                return;
            }
            console.error("Error fetching the URL:", error);
            res.status(500).json({ error: 'Failed to fetch the m3u8 URL' });
        }

    } catch (error) {
        console.error("M3U8 proxy error:", error);
        res.status(500).json({ error: 'Internal proxy error' });
    }
}
