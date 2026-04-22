import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import env from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import apiRouter from './routes/index.js';
import { AppError } from './utils/apiResponse.js';
import logger from './utils/logger.js';

// ── Create Express app ──────────────────────────────────────────
const app = express();

// ── Trust proxy (for rate limiting behind nginx/docker) ─────────
app.set('trust proxy', 1);

// ── Security headers ────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        scriptSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ── CORS ────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        env.CLIENT_URL,
        'http://localhost:3000',
        'http://localhost:5173',
      ];
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new AppError(403, 'Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'],
    maxAge: 86400, // 24 hours preflight cache
  })
);

// ── Body parsers ────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── Compression ─────────────────────────────────────────────────
app.use(compression());

// ── HTTP request logging ────────────────────────────────────────
app.use(requestLogger);

// ── Global rate limit ───────────────────────────────────────────
app.use(env.API_PREFIX, apiLimiter);

// ── Swagger / OpenAPI docs ──────────────────────────────────────
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NG😊NE API',
      version: '1.0.0',
      description:
        'Production-grade API for the NGone NGO platform — connecting volunteers, NGOs, donors, and communities across India.',
      contact: {
        name: 'NGone Team',
        email: 'hello@ngone.in',
        url: 'https://ngone.in',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}${env.API_PREFIX}`,
        description: 'Development server',
      },
      {
        url: `https://api.ngone.in${env.API_PREFIX}`,
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your access token',
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                hasMore: { type: 'boolean' },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['VOLUNTEER', 'NGO_COORDINATOR', 'DONOR', 'ADMIN'] },
            avatarUrl: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            isVerified: { type: 'boolean' },
            isActive: { type: 'boolean' },
          },
        },
        Volunteer: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            skills: { type: 'array', items: { type: 'string' } },
            level: { type: 'string', enum: ['ROOKIE', 'RESPONDER', 'HERO', 'LEGEND'] },
            points: { type: 'integer' },
            isOnline: { type: 'boolean' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
          },
        },
        Crisis: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string' },
            urgency: { type: 'string' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            status: { type: 'string' },
          },
        },
        Team: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            maxSize: { type: 'integer' },
            currentSize: { type: 'integer' },
          },
        },
        Donation: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string', example: 'INR' },
            status: { type: 'string' },
            type: { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'API health checks' },
      { name: 'Auth', description: 'Authentication & authorization' },
      { name: 'Users', description: 'User management' },
      { name: 'Volunteers', description: 'Volunteer profiles & matching' },
      { name: 'NGOs', description: 'NGO management & verification' },
      { name: 'Crises', description: 'Crisis management & dispatch' },
      { name: 'Teams', description: 'Team formation & invites' },
      { name: 'Chat', description: 'Team chat & messaging' },
      { name: 'Donations', description: 'Razorpay payments & receipts' },
      { name: 'Resources', description: 'Resource inventory & allocation' },
      { name: 'Programmes', description: 'NGO programmes & events' },
      { name: 'Notifications', description: 'In-app notifications' },
    ],
  },
  apis: ['./src/modules/**/*.routes.js', './src/routes/index.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use(
  `${env.API_PREFIX}/docs`,
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: `
      .swagger-ui .topbar { background-color: #FF6B35; }
      .swagger-ui .topbar .download-url-wrapper .select-label { color: #fff; }
    `,
    customSiteTitle: 'NGone API Documentation',
    customfavIcon: '/favicon.ico',
  })
);

// ── Postman collection export ───────────────────────────────────
app.get(`${env.API_PREFIX}/postman`, (req, res) => {
  res.status(200).json(swaggerSpec);
});

// ── API routes ──────────────────────────────────────────────────
app.use(env.API_PREFIX, apiRouter);

// ── Root endpoint ───────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to NG😊NE API',
    data: {
      version: '1.0.0',
      docs: `${env.API_PREFIX}/docs`,
      health: `${env.API_PREFIX}/health`,
    },
  });
});

// ── 404 handler ─────────────────────────────────────────────────
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
    code: 'NOT_FOUND',
  });
});

// ── Global error handler ────────────────────────────────────────
app.use(errorHandler);

// ── Unhandled rejection handler ─────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;
