/**
 * 数据库模块统一导出文件
 * 提供数据库连接、模型和服务的统一入口
 */

// 导出数据库连接
export { default as DatabaseConnection } from './connection';

// 导出模型
export { default as IncrementalUser } from './model/incrementalUser';
export type { IIncrementalUser, IncrementalUserData } from './model/incrementalUser';

// 导出服务
export { IncrementalUserService } from '../services/IncrementalUserService';
export { FastGPTUserService } from '../services/FastGPTUserService';

/**
 * 检查数据库表是否存在
 */
export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const DatabaseConnection = (await import('./connection')).default;
    if (!DatabaseConnection.isConnectionReady()) {
      throw new Error('数据库连接未就绪');
    }

    const mongoose = (await import('mongoose')).default;
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('数据库连接对象不可用');
    }
    const collections = await db.listCollections({ name: tableName }).toArray();
    return collections.length > 0;
  } catch (error) {
    console.error(`检查表 ${tableName} 是否存在时出错:`, error);
    return false;
  }
}

/**
 * 确保所有必要的表和索引都存在
 */
export async function ensureTablesAndIndexes(): Promise<void> {
  try {
    const DatabaseConnection = (await import('./connection')).default;
    if (!DatabaseConnection.isConnectionReady()) {
      throw new Error('数据库连接未就绪');
    }

    // 检查 incremental_users 表是否存在
    const incrementalUsersExists = await checkTableExists('incremental_users');

    if (!incrementalUsersExists) {
      console.log('incremental_users 表不存在，正在创建...');

      // 导入模型以触发表创建
      const IncrementalUser = (await import('./model/incrementalUser')).default;

      // 创建一个临时文档来触发集合创建，然后立即删除
      const tempDoc = new IncrementalUser({
        username: 'temp_init_user',
        memberName: 'temp',
        avatar: 'temp',
        contact: 'temp',
        orgs: []
      });
      await tempDoc.save();
      await IncrementalUser.deleteOne({ username: 'temp_init_user' });

      console.log('incremental_users 表创建成功');
    } else {
      console.log('incremental_users 表已存在');
    }

    // 确保索引存在
    const IncrementalUser = (await import('./model/incrementalUser')).default;
    await IncrementalUser.createIndexes();
    console.log('数据库索引检查和创建完成');
  } catch (error) {
    console.error('确保表和索引存在时出错:', error);
    throw error;
  }
}

/**
 * 初始化数据库连接
 * 在应用启动时调用
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const DatabaseConnection = (await import('./connection')).default;
    await DatabaseConnection.connect();
    console.log('数据库初始化成功');

    // 确保所有必要的表和索引都存在
    await ensureTablesAndIndexes();
    console.log('数据库表和索引检查完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

/**
 * 关闭数据库连接
 * 在应用关闭时调用
 */
export async function closeDatabaseConnection(): Promise<void> {
  try {
    const DatabaseConnection = (await import('./connection')).default;
    await DatabaseConnection.disconnect();
    console.log('数据库连接已关闭');
  } catch (error) {
    console.error('关闭数据库连接时出错:', error);
    throw error;
  }
}

/**
 * 检查数据库连接状态
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const DatabaseConnection = (await import('./connection')).default;
    return DatabaseConnection.isConnectionReady();
  } catch (error) {
    console.error('检查数据库连接状态时出错:', error);
    return false;
  }
}
