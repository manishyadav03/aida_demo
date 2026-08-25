const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const toolRoutes = require('./routes/tool.routes');
const { healthCheck } = require('./controllers/tool.controller');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// HTTP request logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Health Check Route
app.get('/health', healthCheck);

// API Toolset Routes
app.use('/api/tools', toolRoutes);

// 404 handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
