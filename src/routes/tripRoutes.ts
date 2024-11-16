import express from 'express';
import {tripModel} from '../models/trip';
import {logger} from '../config/logger';
import {authenticateToken} from '../middleware/auth';

const router = express.Router();

// 添加认证中间件
router.use(authenticateToken as any);

router.post('/generate', async (req, res) => {
    try {
        const {preferences} = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({message: '未提供用户ID'});
        }

        const plan = await tripModel.createPlan(userId, preferences);
        res.json(plan);
    } catch (error: any) {
        logger.error('生成行程计划失败:', error);
        res.status(500).json({
            error: '生成行程计划失败',
            detail: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/my-trips', async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({message: '未提供用户ID'});
        }

        const trips = await tripModel.getUserTrips(userId);
        res.json(trips);
    } catch (error) {
        logger.error('获取用户行程失败:', error);
        res.status(500).json({message: '获取用户行程失败'});
    }
});

export default router;