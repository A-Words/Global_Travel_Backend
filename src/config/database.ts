import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { logger } from './logger';
import heritagesData from '../data/heritages.json';

dotenv.config();

const createPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME_HERITAGE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const pool = createPool;

export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    logger.info('MySQL 数据库连接成功');
    connection.release();
  } catch (error) {
    logger.error('MySQL 数据库连接失败:', {
      error: error,
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    return false;
  }
  return true;
};

export const getFallbackData = () => {
  return heritagesData.heritages;
}; 