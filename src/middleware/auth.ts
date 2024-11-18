import {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import {logger} from '../config/logger';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({message: '未提供认证令牌'});
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded as jwt.JwtPayload & { id: string; username: string };
        next();
    } catch (error) {
        logger.error('Token验证失败:', error);
        return res.status(403).json({message: '无效的认证令牌'});
    }
};