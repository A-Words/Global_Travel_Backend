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

export const tripModel = {
    async createPlan(userId: string, preferences: TripPreference) {
        const connection = await pool.getConnection();
        try {
            // 1. 获取目的地详细信息
            const [destinations] = await connection.execute<RowDataPacket[]>(
                'SELECT * FROM heritages WHERE id IN (?)',
                [preferences.destinations]
            );

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
    }
};