import * as dotenv from 'dotenv'
dotenv.config()
export const BASE_PATH = process.env.BASE_PATH || ''
export const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

// If empty or contains '*', allow all. Otherwise, only listed origins.
const origins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || []
export const allowAll = origins.length === 0 || origins.includes('*')
export const allowedOrigins = origins

