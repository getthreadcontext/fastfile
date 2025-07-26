import express from 'express';
import cors from 'cors';
import { corsOptions, errorHandler, requestLogger } from './middleware/index';
import conversionRoutes from './routes/conversion';
import { CleanupManager } from './utils/cleanupManager';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize cleanup manager
const cleanupManager = CleanupManager.getInstance();

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/api', conversionRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handler
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Graceful shutdown...');
  cleanupManager.cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Graceful shutdown...');
  cleanupManager.cleanup();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Clear directories on startup
    await cleanupManager.clearDirectoriesOnStartup();
    
    app.listen(PORT, () => {
      console.log(`🚀 FastFile Server running on port ${PORT}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📝 API endpoints available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
