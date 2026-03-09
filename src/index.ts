import express from "express";
import m3u8 from "./routes/m3u8-proxy";
import TsProxy from "./routes/ts-proxy";
import { allowedOrigins, allowAll } from "./utils/utils";
import * as dotenv from 'dotenv'
dotenv.config()

const app = express();
const PORT = process.env.PORT || 80;

const asciiart = `
  ▄▄▄                             ▄▄▄  ▄▄▄   ▄▄▄      ▄▄▄▄▄          ▄▄▄▄▄▄
 █▀██  ██                        █▀██  ██   ▀██▀     ██▀▀▀▀█▄       █▀██▀▀▀█▄
   ██  ██        ▄▄     ▀▀         ██  ██    ██      ▀██▄  ▄▀         ██▄▄▄█▀▄
   ██  ██  ██ ██ ██ ▄█▀ ██         ██████    ██        ▀██▄▄          ██▀▀▀  ████▄▄███▄▀██ ██▀ ██ ██
   ██  ██  ██ ██ ████   ██ ▀▀▀▀    ██  ██    ██      ▄   ▀██▄ ▀▀▀▀  ▄ ██     ██   ██ ██  ███   ██▄██
   ▀█████▄▄▄▀██▀█▄██ ▀█▄▄██       ▀██▀  ▀██▄ ████████ ▀██████▀       ▀██▀    ▄█▀  ▄▀███▀▄██ ██▄▄▄▀██▀
   ▄   ██                                                                                        ██
   ▀████▀                                                                                      ▀▀▀
`;

app.use(express.json());

// CORS middleware - handles preflight OPTIONS requests
app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Check if origin is allowed
    if (!allowAll) {
        if (!origin || !allowedOrigins.includes(origin)) {
            if (req.method === 'OPTIONS') {
                res.status(403).end();
                return;
            }
            // Let the route handlers deal with non-OPTIONS requests
            next();
            return;
        }
    }

    // Set CORS headers
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (allowAll) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    next();
});

//routes
app.get("/m3u8-proxy.m3u8", m3u8)
app.get('/ts-proxy.ts', TsProxy)

app.listen(PORT, () => {
  console.log(asciiart)
  console.log(`🥀 Running on http://localhost:${PORT}`);
});
