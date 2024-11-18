import express from 'express';
import {userModel} from '../models/user';
import {logger} from '../config/logger';
import {authenticateToken} from '../middleware/auth';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';

const router = express.Router();

router.use(authenticateToken);

const storage = multer.diskStorage({
    destination: 'uploads/avatars',
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (!allowedTypes.includes(file.mimetype)) {
            cb(new Error('只允许上传 JPG/PNG 格式的图片'));
            return;
        }
        cb(null, true);
    },
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB
    }
});

// 更新用户设置
router.put('/settings', async (req, res) => {
    try {
        const userId = req.user?.id;
        const {username, email} = req.body;

        if (!userId) {
            return res.status(401).json({message: '未提供用户ID'});
        }

        const updated = await userModel.updateSettings(userId, {username, email});
        if (!updated) {
            return res.status(400).json({message: '更新失败'});
        }

        res.json({message: '设置更新成功'});
    } catch (error) {
        logger.error('更新用户设置失败:', error);
        res.status(500).json({message: '更新设置失败'});
    }
});

// 修改密码
router.put('/change-password', async (req, res) => {
    try {
        const userId = req.user?.id;
        const {oldPassword, newPassword} = req.body;

        if (!userId) {
            return res.status(401).json({message: '未提供用户ID'});
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({message: '用户不存在'});
        }

        const isValidPassword = await bcrypt.compare(oldPassword, user.password);
        if (!isValidPassword) {
            return res.status(400).json({message: '当前密码错误'});
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updated = await userModel.updatePassword(userId, hashedPassword);

        if (!updated) {
            return res.status(400).json({message: '密码修改失败'});
        }

        res.json({message: '密码修改成功'});
    } catch (error) {
        logger.error('修改密码失败:', error);
        res.status(500).json({message: '修改密码失败'});
    }
});

router.put('/avatar', upload.single('avatar'), async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId || !req.file) {
            return res.status(400).json({message: '未提供用户ID或头像文件'});
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        const updated = await userModel.updateAvatar(userId, avatarUrl);

        if (!updated) {
            return res.status(400).json({message: '更新头像失败'});
        }

        res.json({
            message: '头像更新成功',
            avatarUrl
        });
    } catch (error) {
        logger.error('更新头像失败:', error);
        res.status(500).json({message: '更新头像失败'});
    }
});

export default router;