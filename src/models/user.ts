import {pool} from '../config/database';
import bcrypt from 'bcryptjs';
import {logger} from '../config/logger';
import {RowDataPacket} from 'mysql2';

export const userModel = {
    async createUser(username: string, email: string, password: string) {
        const connection = await pool.getConnection();
        try {
            // 检查用户名或邮箱是否已存在
            const [existingUsers] = await connection.execute<RowDataPacket[]>(
                'SELECT * FROM users WHERE username = ? OR email = ?',
                [username, email]
            );

            if (existingUsers.length > 0) {
                throw new Error('用户名或邮箱已存在');
            }

            // 密码加密
            const hashedPassword = await bcrypt.hash(password, 10);

            // 创建用户
            const [result] = await connection.execute(
                'INSERT INTO users (username, email, password, created_at, last_login_at) VALUES (?, ?, ?, NOW(), NOW())',
                [username, email, hashedPassword]
            );

            return result;
        } catch (error) {
            logger.error('创建用户失败:', error);
            throw error;
        } finally {
            connection.release();
        }
    },

    async validateUser(username: string, password: string) {
        const connection = await pool.getConnection();
        try {
            const [users] = await connection.execute<RowDataPacket[]>(
                'SELECT * FROM users WHERE username = ?',
                [username]
            );

            if (users.length === 0) {
                return null;
            }

            const user = users[0];
            const isValid = await bcrypt.compare(password, user.password);

            if (!isValid) {
                return null;
            }

            // 更新最后登录时间
            await connection.execute(
                'UPDATE users SET last_login_at = NOW() WHERE id = ?',
                [user.id]
            );

            return {
                id: user.id,
                username: user.username,
                email: user.email
            };
        } catch (error) {
            logger.error('验证用户失败:', error);
            throw error;
        } finally {
            connection.release();
        }
    },

    async validateEmailUser(email: string, captcha: string) {
        const connection = await pool.getConnection();
        try {
            // 验证验证码是否正确
            if (captcha !== '1234') { // 临时使用固定验证码，后续需要改为真实验证码系统
                return null;
            }

            const [users] = await connection.execute<RowDataPacket[]>(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );

            if (users.length === 0) {
                return null;
            }

            const user = users[0];

            // 更新最后登录时间
            await connection.execute(
                'UPDATE users SET last_login_at = NOW() WHERE id = ?',
                [user.id]
            );

            return {
                id: user.id,
                username: user.username,
                email: user.email
            };
        } catch (error) {
            logger.error('邮箱验证失败:', error);
            throw error;
        } finally {
            connection.release();
        }
    },

    async findByUsername(username: string) {
        const connection = await pool.getConnection();
        try {
            const [users] = await connection.execute<RowDataPacket[]>(
                'SELECT * FROM users WHERE username = ?',
                [username]
            );

            if (users.length === 0) {
                return null;
            }

            const user = users[0];
            return {
                id: user.id,
                username: user.username,
                email: user.email
            };
        } catch (error) {
            logger.error('查找用户失败:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
};