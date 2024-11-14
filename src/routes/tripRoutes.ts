import express from 'express';
import {tripModel} from '../models/trip';
import {logger} from '../config/logger';

const router = express.Router();

router.post('/generate', async (req, res) => {
    try {
        const {preferences} = req.body;
        // 这里暂时使用固定的 userId，后续可以从认证中间件获取
        const userId = 'default-user';
        const plan = await tripModel.createPlan(userId, preferences);
        res.json(plan);
    } catch (error) {
        logger.error('生成行程计划失败:', error);
        res.status(500).json({
            error: '生成行程计划失败',
            detail: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

export default router;