import { Heritage } from '../types/heritage';
import { pool, getFallbackData } from '../config/database';
import { logger } from '../config/logger';
import { RowDataPacket } from 'mysql2';

class HeritageRepository {
  private useFallback: boolean = false;

  setUseFallback(value: boolean) {
    this.useFallback = value;
  }

  private transformDbToHeritage(row: any): Heritage {
    return {
      id: row.id,
      name: row.name,
      location: row.location,
      country: row.country,
      category: row.category,
      description: row.description,
      imageUrl: row.imageUrl,
      hasVR: row.hasVR,
      hasAR: row.hasAR,
      yearInscribed: row.yearInscribed,
      coordinates: row.coordinates,
      tags: row.tags,
      visitingInfo: {
        bestTime: row.visiting_best_time,
        duration: row.visiting_duration,
        ticketPrice: row.visiting_ticket_price
      }
    };
  }

  async findAll(): Promise<Heritage[]> {
    if (this.useFallback) {
      return getFallbackData();
    }

    try {
      const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM heritages');
      return rows.map(row => this.transformDbToHeritage(row));
    } catch (error) {
      logger.error('查询所有遗产失败:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<Heritage | null> {
    if (this.useFallback) {
      return getFallbackData().find(h => h.id === id) || null;
    }

    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM heritages WHERE id = ?',
        [id]
      );
      return rows[0] ? this.transformDbToHeritage(rows[0]) : null;
    } catch (error) {
      logger.error(`查询遗产 ID ${id} 失败:`, error);
      throw error;
    }
  }

  async findByCategory(category: string): Promise<Heritage[]> {
    if (this.useFallback) {
      return getFallbackData().filter(h => h.category.includes(category));
    }

    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM heritages WHERE JSON_CONTAINS(category, ?)',
        [JSON.stringify(category)]
      );
      return rows as Heritage[];
    } catch (error) {
      logger.error(`按分类 ${category} 查询遗产失败:`, error);
      throw error;
    }
  }

  async search(query: string): Promise<Heritage[]> {
    if (this.useFallback) {
      const lowercaseQuery = query.toLowerCase();
      return getFallbackData().filter(h =>
        h.name.toLowerCase().includes(lowercaseQuery) ||
        h.location.toLowerCase().includes(lowercaseQuery) ||
        h.description.toLowerCase().includes(lowercaseQuery)
      );
    }

    try {
      const searchPattern = `%${query}%`;
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM heritages WHERE name LIKE ? OR location LIKE ? OR description LIKE ?',
        [searchPattern, searchPattern, searchPattern]
      );
      return rows as Heritage[];
    } catch (error) {
      logger.error(`搜索遗产 "${query}" 失败:`, error);
      throw error;
    }
  }
}

export const heritageModel = new HeritageRepository();