import express from 'express';
import cors from 'cors';
import { corsOptions, errorHandler, requestLogger } from './middleware/index';
import conversionRoutes from './routes/conversion';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/api', conversionRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FastFile Server running on port ${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📝 API endpoints available at http://localhost:${PORT}/api`);
});

export default app;
