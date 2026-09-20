import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';

import { bootstrapAppEngine } from './bootstrap';
import gatewayRouter from './expressApiGateway';
import authRouter from './authRoutes';
import walletRouter from './walletRoutes';
import bettingRouter from './bettingRoutes';
import matchesRouter from './matchesRoutes';
import adminRouter from './adminRoutes';
import biometricRouter from './biometricRoutes';

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const API_VERSION = process.env.API_VERSION || 'v2';

/*
|--------------------------------------------------------------------------
| Security
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : true;

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

/*
|--------------------------------------------------------------------------
| Performance
|--------------------------------------------------------------------------
*/

app.use(compression());

/*
|--------------------------------------------------------------------------
| Body Parsing
|--------------------------------------------------------------------------
*/

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/*
|--------------------------------------------------------------------------
| Request Logging
|--------------------------------------------------------------------------
*/

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(
    `[HTTP] ${req.method} ${req.originalUrl} - IP: ${req.ip} - User-Agent: ${req.headers['user-agent'] || 'unknown'}`
  );

  next();
});

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'ShebaOdds Enterprise Platform Service',
    version: '3.0.0',
    status: 'Operational',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/*
|--------------------------------------------------------------------------
| Render Health Check
|--------------------------------------------------------------------------
*/

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'shebaodds-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/*
|--------------------------------------------------------------------------
| Translations (all languages, not just Amharic)
|--------------------------------------------------------------------------
*/

app.use('/locales', express.static(path.join(__dirname, 'locales')));

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| ⚠️ Mount order matters here. expressApiGateway.ts ("gatewayRouter") defines
| its own separate Mongoose models and its own /auth/*, /wallet/* handlers —
| duplicates of the more complete, validated versions in authRoutes.ts /
| walletRoutes.ts. If gatewayRouter is mounted first, Express matches its
| cruder duplicate for any overlapping path and the real implementation
| never runs. Specific routers are mounted first on purpose; gatewayRouter
| goes last and only actually serves the routes unique to it. See the
| warning comment at the top of expressApiGateway.ts for the full story.
*/

const mountApiRoutes = (prefix: string) => {
  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/wallet`, walletRouter);
  app.use(`${prefix}/bets`, bettingRouter);
  app.use(`${prefix}/matches`, matchesRouter);
  app.use(`${prefix}/admin`, adminRouter);
  app.use(`${prefix}/biometric`, biometricRouter);
  app.use(prefix, gatewayRouter);
};

// Versioned, as API_VERSION intends...
mountApiRoutes(`/api/${API_VERSION}`);
// ...and an unversioned alias, because App.jsx calls /api/auth/*, /api/bets/*,
// etc. directly without a version segment. Drop this once the frontend calls
// /api/${API_VERSION} instead.
mountApiRoutes('/api');

// App.jsx polls this on login; no route existed for it anywhere in the
// codebase (silent 404s, swallowed by the frontend's try/catch). Honest empty
// stub until real notification storage/delivery exists.
app.get(['/api/notifications', `/api/${API_VERSION}/notifications`], (_req: Request, res: Response) => {
  res.json({ success: true, notifications: [], unreadCount: 0 });
});

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} does not exist`
  });
});

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

app.use(
  (
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error(
      '💥 [GLOBAL UNHANDLED EXCEPTION]:',
      err
    );

    res.status(err?.status || 500).json({
      success: false,
      error: 'Internal Server Error',
      message:
        err?.message ||
        'An unexpected server error occurred'
    });
  }
);

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

async function startServer(): Promise<void> {
  try {
    console.log('--------------------------------------------------');
    console.log('🚀 Starting ShebaOdds backend...');
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 Port: ${PORT}`);
    console.log(`🔗 API Version: ${API_VERSION}`);
    console.log('--------------------------------------------------');

    /*
     * Initialize database and application services.
     */
    await bootstrapAppEngine();

    /*
     * Start HTTP server.
     */
    app.listen(PORT, '0.0.0.0', () => {
      console.log('============================================================');
      console.log('⚡ SHEBAODDS BACKEND IS RUNNING');
      console.log(`🌐 Port: ${PORT}`);
      console.log(`🔗 API: /api/${API_VERSION}`);
      console.log(`❤️ Health: /health`);
      console.log('============================================================');
    });
  } catch (error) {
    console.error(
      '💥 [SERVER FATAL STARTUP FAILURE]'
    );

    console.error(error);

    process.exit(1);
  }
}

startServer();

export default app;