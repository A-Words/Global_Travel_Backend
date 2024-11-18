import {pool} from '../config/database';
import {SparkClient} from '../services/sparkClient';
import {logger} from '../config/logger';
import {RowDataPacket} from 'mysql2';

interface TripPreference {
    destinations: string[];
    dateRange: [string, string] | null;
    travelers: number;
    interests: string[];
}

interface TripPlan {
    id: string;
    preferences: TripPreference;
    planContent: string;
    status: 'pending' | 'completed' | 'failed';
    createdAt: Date;
}

export const tripModel = {
    async createPlan(userId: string, preferences: TripPreference) {
        const connection = await pool.getConnection();
        try {
            // 验证是否选择了目的地
            if (!preferences.destinations || preferences.destinations.length === 0) {
                throw new Error('未选择目的地');
            }

            // 1.验证所有目的地 ID 是否有效
            const [destinations] = await connection.execute<RowDataPacket[]>(
                `SELECT * FROM heritages WHERE id IN (${preferences.destinations.map(() => '?').join(',')})`,
                [...preferences.destinations]
            );

            if (destinations.length !== preferences.destinations.length) {
                throw new Error('部分目的地不存在');
            }

            // 2. 调用星火大模型生成行程
            const spark = new SparkClient();
            const prompt = `
        请根据以下信息生成一份详细的旅游行程规划：
        目的地: ${destinations.map((d: any) => d.name).join(', ')}
        日期: ${preferences.dateRange ? preferences.dateRange.join(' 至 ') : '待定'}
        出行人数: ${preferences.travelers}人
        兴趣主题: ${preferences.interests.join(', ')}
        
        要求：
        1. 合理安排游览顺序和时间
        2. 考虑景点之间的距离
        3. 记得返回目的地信息，每个景点提供参观重点和建议
        4. 根据兴趣主题突出相关内容
        5. 适当安排休息和用餐时间
      `;

            const planContent = await spark.chat(prompt);

            // 3. 保存到数据库
            const planId = Date.now().toString();
            await connection.execute(
                'INSERT INTO trip_plans (id, user_id, preferences, plan_content, status) VALUES (?, ?, ?, ?, ?)',
                [planId, userId, JSON.stringify(preferences), planContent, 'completed']
            );

            return {
                id: planId,
                preferences,
                plan: planContent
            };
        } catch (error) {
            logger.error('生成行程计划失败:', error);
            throw error;
        } finally {
            connection.release();
        }
    },

    async getPlan(planId: string) {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM trip_plans WHERE id = ?',
            [planId]
        );
        return rows[0] as RowDataPacket;
    },

    async getUserTrips(userId: string) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.execute<RowDataPacket[]>(
                'SELECT id, preferences, plan_content as planContent, status, DATE_FORMAT(created_at, "%Y-%m-%dT%H:%i:%s.000Z") as createdAt FROM trip_plans WHERE user_id = ? ORDER BY created_at DESC',
                [userId]
            );

            return rows.map(row => ({
                id: row.id,
                preferences: typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences,
                planContent: row.planContent,
                status: row.status,
                createdAt: row.createdAt
            }));
        } catch (error) {
            logger.error('获取用户行程失败:', error);
            throw error;
        } finally {
            connection.release();
        }
    },

    async getTripById(tripId: string): Promise<TripPlan | null> {
        const connection = await pool.getConnection();
        try {
            const [trips] = await connection.execute<RowDataPacket[]>(
                'SELECT * FROM trip_plans WHERE id = ?',
                [tripId]
            );
            if (trips.length === 0) {
                return null;
            }
            const trip = trips[0];
            return {
                id: trip.id,
                preferences: JSON.parse(trip.preferences),
                planContent: trip.plan_content,
                status: trip.status,
                createdAt: trip.created_at
            };
        } catch (error) {
            logger.error('获取行程详情失败:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
};