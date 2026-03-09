<p align="center">
      <img
        src="./public/logo.png"
        width="200"
        height="200"
      />
    </p>

# <p align="center">Yuki-HLS-Proxy</p>

<p align="center">
  The ultimate HLS proxy server. Handles **any** HLS stream you throw at it.
  <br />
<a href="https://vidstack.io/player/demo/?framework=react&view=player&config=%7B%22player%22%3A%7B%22src%22%3A%22h       
         +ttps%3A%2F%2Fyuki-hls-proxy.vercel.app%2Fm3u8-proxy.m3u8%3Furl%3Dhttps%253A%252F%252Ftest-streams.mux.dev%252Fx36xhzz%252       
         +Fx36xhzz.m3u8%26headers%3D%7B%2522Referer%2522%3A%2522https%3A%2F%2Fexample.com%2522%7D%22%2C%22viewType%22%3A%22video%22       
         +%2C%22streamType%22%3A%22on-demand%22%2C%22logLevel%22%3A%22warn%22%2C%22crossOrigin%22%3Atrue%2C%22playsInline%22%3Atrue       
         +%2C%22title%22%3A%22Yuki-HLS-Player%22%7D%2C%22layout%22%3A%7B%22type%22%3A%22default%22%7D%2C%22hls%22%3A%7B%7D%2C%22das       
         +h%22%3A%7B%7D%2C%22events%22%3A%5B%22can-play%22%5D%7D&preset=hls">👉 Live Demo 👈</a>
</p>


## What Can It Proxy?

**Everything.**

| Feature | Support |
|---------|---------|
| Master Playlists | ✅ |
| Media Playlists | ✅ |
| TS Segments | ✅ |
| fMP4 Segments | ✅ |
| **AES-128 Encrypted Streams** | ✅ |
| **SAMPLE-AES Encrypted Streams** | ✅ |
| Encryption Key Proxying | ✅ |
| Low-Latency HLS (LL-HLS) | ✅ |
| Partial Segments | ✅ |
| I-Frame Playlists | ✅ |
| Alternate Audio/Subtitles | ✅ |
| Byte-Range Requests | ✅ |
| Header Passthrough | ✅ |
| CORS Support | ✅ |

Protected stream with Referer checks? ✅
Cookie-based authentication? ✅
Custom headers? ✅
Encrypted with AES keys? ✅

**It just works.**

## Prerequisites

### Install Node.js & npm (Ubuntu/Debian)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Install Docker (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y snapd
sudo snap install docker
```

> After installing Docker via snap, you may need to log out and back in for permissions to apply.

---

## Quick Start

### Node.js Setup

```bash
# Clone the repo
git clone https://github.com/rishabnotfound/Yuki-HLS-Proxy.git
cd Yuki-HLS-Proxy

# Install dependencies
npm install

# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

### Docker Setup

```bash
git clone https://github.com/rishabnotfound/Yuki-HLS-Proxy.git
cd Yuki-HLS-Proxy
docker compose up -d --build
```

---

## Environment Variables

Create a `.env` file:

```env
PORT=80
BASE_PATH=http://localhost
ALLOWED_ORIGINS=*
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 80) |
| `BASE_PATH` | No | Public URL for rewritten links |
| `ALLOWED_ORIGINS` | No | Set to `*` or leave empty to allow all. Otherwise, comma-separated list of allowed origins with trailing comma (blocks everyone else with 403) |

---

## Deploying to Production (Newbie Guide)

Want to run this on a server with your own domain? Here's how:

### 1. Get a VPS
Any cheap VPS works (DigitalOcean, Vultr, Hetzner, etc.)

### 2. Set up your `.env`
```env
PORT=80
BASE_PATH=https://proxy.yourdomain.com
ALLOWED_ORIGINS=https://yoursite.com,
```

### 3. Point your domain to the server
Go to Cloudflare (or your DNS provider):
- Add an **A record**: `proxy` → `YOUR_SERVER_IP`
- Enable the orange cloud (Cloudflare proxy) for free SSL

### 4. Run it
```bash
docker compose up -d --build
```
or
```bash
npm install
npm run build
npm run start
```

**That's it.** Your proxy is now live at `https://proxy.yourdomain.com`

> **Pro tip:** Cloudflare's free tier gives you SSL, DDoS protection, and caching. Just set `PORT=80` and let Cloudflare handle HTTPS.

---

## API Endpoints

### `GET /m3u8-proxy.m3u8`

Proxies M3U8 playlists with URL rewriting.

| Parameter | Description |
|-----------|-------------|
| `url` | Double URL-encoded M3U8 URL |
| `headers` | URL-encoded JSON headers object |

### `GET /ts-proxy.ts`

Proxies media segments (TS, fMP4, encryption keys).

| Parameter | Description |
|-----------|-------------|
| `url` | Double URL-encoded segment URL |
| `headers` | URL-encoded JSON headers object |

---

## Usage Example

```javascript
const streamUrl = 'https://example.com/stream.m3u8';
const headers = {
  'Referer': 'https://example.com',
  'Cookie': 'session=abc123'
};

const proxyUrl = `http://localhost/m3u8-proxy.m3u8?url=${
  encodeURIComponent(encodeURIComponent(streamUrl))
}&headers=${
  encodeURIComponent(JSON.stringify(headers))
}`;

// Use proxyUrl in any HLS player (hls.js, video.js, etc.)
```

---

## Testing

```bash
node test.js
```

---

## License

[MIT](LICENSE) 

**(do whatever you want man, i do know exactly what you gonna use this for 🥀)**

## Credits

Built by [rishabnotfound](https://github.com/rishabnotfound)

Based on [ng-proxy](https://github.com/Nameless-Monster-Nerd/ng-proxy)