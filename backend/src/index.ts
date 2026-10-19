import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { tripRoutes } from './routes/trips';
import { driverRoutes } from './routes/drivers';
import { riderRoutes } from './routes/riders';
import { authRoutes } from './routes/auth';
import { newsRoutes } from './routes/news';
import { adminRoutes } from './routes/admin';
import { expireStaleOffers } from './dispatch_engine';
import { log } from './lib/logger';

const app = express();
const isDev = (process.env.NODE_ENV ?? 'development') === 'development';

function buildAllowedOrigins(): Set<string> {
  const raw = process.env.CORS_ORIGINS ?? '';
  const envOrigins = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const hardcodedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'capacitor://localhost',
    'ionic://localhost',
  ];
  return new Set([...envOrigins, ...hardcodedOrigins]);
}

const allowedOrigins = buildAllowedOrigins();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients/curl without Origin header.
      if (!origin) return callback(null, true);
      if (isDev) {
        const devAllowed =
          origin.startsWith('http://localhost')
          || origin.startsWith('http://192.168.')
          || origin.startsWith('http://10.')
          || origin.startsWith('capacitor://')
          || origin.startsWith('ionic://');
        if (devAllowed) return callback(null, true);
      }
      return callback(null, allowedOrigins.has(origin));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const incoming = req.headers['x-correlation-id'];
  const correlationId = typeof incoming === 'string' ? incoming : uuidv4();
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
});

// ── Global rate limits ────────────────────────────────────────────────────────
const defaultLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 10, // 10 OTP requests per 10 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later.' },
});

app.use('/api', defaultLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/admin', adminRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    db: process.env.SUPABASE_URL ? (process.env.SUPABASE_SERVICE_ROLE_KEY ? 'connected' : 'degraded') : 'degraded',
    service: 'wasel-backend',
    version: '0.2.0',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── Dispatch info ─────────────────────────────────────────────────────────────
app.get('/api/dispatch/info', (_req, res) => {
  res.json({
    algorithm: 'BMP — Best Match Priority',
    weights: { proximity: 0.40, subscription: 0.30, activity: 0.20, idle: 0.10 },
    tierWeights: { tier1: 0.40, tier2: 0.70, tier3: 1.00 },
    searchRadiusKm: 5,
    offerTtlSeconds: 15,
    deliveryMethod: 'supabase-realtime',
  });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  log.error('Unhandled backend error', {
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    correlationId: _req.headers['x-correlation-id'],
  });
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3001;
app.listen(Number(PORT), '0.0.0.0', () => {
  log.info('Backend started', {
    port: Number(PORT),
    health: `http://localhost:${PORT}/health`,
  });

  // Offer expiry cleanup — runs every 8 seconds to expire stale pending offers
  // and re-dispatch to the next-best driver automatically
  setInterval(() => {
    expireStaleOffers().catch(err =>
      log.warn('Offer expiry cleanup failed', { error: String(err) }),
    );
  }, 8_000);
});
