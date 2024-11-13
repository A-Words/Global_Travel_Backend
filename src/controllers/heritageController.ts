import { Request, Response } from 'express';
import { heritageModel } from '../models/heritage';

export const heritageController = {
    async getAllHeritages(req: Request, res: Response) {
        try {
            const { category, q } = req.query;
            let heritages;

            if (category) {
                heritages = await heritageModel.findByCategory(category as string);
            } else if (q) {
                heritages = await heritageModel.search(q as string);
            } else {
                heritages = await heritageModel.findAll();
            }

            res.json({ heritages });
        } catch (error) {
            res.status(500).json({ error: '获取遗产数据失败' });
        }
    },

    async getHeritageById(req: Request, res: Response) {
        try {
            const heritage = await heritageModel.findById(req.params.id);
            if (!heritage) {
                return res.status(404).json({ error: '未找到指定遗产' });
            }
            res.json(heritage);
        } catch (error) {
            res.status(500).json({ error: '获取遗产数据失败' });
        }
    }
};