import express from 'express';
import {userModel} from '../models/user';
import jwt from 'jsonwebtoken';
import {logger} from '../config/logger';
import {JwtPayload} from "../types/jwt";

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const {username, email, password} = req.body;
        await userModel.createUser(username, email, password);

        const token = jwt.sign(
            {username},
            process.env.JWT_SECRET || 'your-secret-key',
            {expiresIn: '24h'}
        );

        res.json({token});
    } catch (error: any) {
        logger.error('注册失败:', error);
        res.status(400).json({message: error.message});
    }
});

router.post('/login', async (req, res) => {
    try {
        const {username, password} = req.body;
        const user = await userModel.validateUser(username, password);

        if (!user) {
            return res.status(401).json({message: '用户名或密码错误'});
        }

        const token = jwt.sign(
            {username: user.username},
            process.env.JWT_SECRET || 'your-secret-key',
            {expiresIn: '24h'}
        );

        res.json({token});
    } catch (error) {
        logger.error('登录失败:', error);
        res.status(500).json({message: '登录失败'});
    }
});

router.post('/login-email', async (req, res) => {
    try {
        const {email, captcha} = req.body;
        const user = await userModel.validateEmailUser(email, captcha);

        if (!user) {
            return res.status(401).json({message: '邮箱或验证码错误'});
        }

        const token = jwt.sign(
            {username: user.username},
            process.env.JWT_SECRET || 'your-secret-key',
            {expiresIn: '24h'}
        );

        res.json({token});
    } catch (error) {
        logger.error('邮箱登录失败:', error);
        res.status(500).json({message: '登录失败'});
    }
});

router.post('/send-captcha', async (req, res) => {
    try {
        const {email} = req.body;
        // 这里应该实现真实的邮件发送逻辑
        // 临时返回成功
        res.json({message: '验证码发送成功'});
    } catch (error) {
        logger.error('发送验证码失败:', error);
        res.status(500).json({message: '发送验证码失败'});
    }
});

router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({message: '未登录'});
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as JwtPayload;
        const user = await userModel.findByUsername(decoded.username);

        if (!user) {
            return res.status(404).json({message: '用户不存在'});
        }

        res.json(user);
    } catch (error) {
        logger.error('获取用户信息失败:', error);
        res.status(401).json({message: '认证失败'});
    }
});

export default router;