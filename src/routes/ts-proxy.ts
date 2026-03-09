import type { Request, Response } from 'express';
import { allowedOrigins, allowAll } from '../utils/utils';
import { Readable } from 'stream';

export default async function TsProxy(req: Request, res: Response): Promise<void> {
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
        const headers = req.query.headers ? JSON.parse(req.query.headers as string) : {};

        if (!url) {
            res.status(400).json({ error: 'URL parameter is required' });
            return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);

        // Client disconnected - abort upstream request
        req.on('close', () => {
            controller.abort();
            clearTimeout(timeout);
        });

        const response = await fetch(url, {
            headers,
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            res.status(response.status).json({ error: `Upstream returned ${response.status}` });
            return;
        }

        // Forward content headers
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');

        if (contentType) res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);

        // Stream directly - no buffering
        if (response.body) {
            const reader = response.body.getReader();

            const stream = new Readable({
                async read() {
                    try {
                        const { done, value } = await reader.read();
                        if (done) {
                            this.push(null);
                        } else {
                            this.push(Buffer.from(value));
                        }
                    } catch {
                        this.destroy();
                    }
                }
            });

            stream.pipe(res);

            stream.on('error', () => {
                reader.cancel();
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Stream error' });
                }
            });
        } else {
            res.status(500).json({ error: 'No response body' });
        }

    } catch (error: any) {
        if (error.name === 'AbortError') {
            if (!res.headersSent) {
                res.status(504).json({ error: 'Upstream timeout' });
            }
            return;
        }
        console.error("TS proxy error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Proxy error' });
        }
    }
}
