import express from 'express';
import cors from 'cors';
import heritageRoutes from './routes/heritageRoutes';
import { testConnection } from './config/database';
import { heritageModel } from './models/heritage';
import { logger } from './config/logger';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 测试数据库连接并设置是否使用备用数据
(async () => {
  const isConnected = await testConnection();
  heritageModel.setUseFallback(!isConnected);
})();

app.use(cors());
app.use(express.json());

app.use('/api', heritageRoutes);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err.stack);
  res.status(500).json({ 
    error: '服务器内部错误',
    detail: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(port, () => {
  logger.info(`服务器运行在 http://localhost:${port}`);
});