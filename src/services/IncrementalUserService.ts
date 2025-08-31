import IncrementalUser, {
  type IIncrementalUser,
  type IncrementalUserData
} from '../database/model/incrementalUser';

/**
 * 增量用户服务类
 * 提供增量用户相关的所有数据库操作
 */
export class IncrementalUserService {
  // 检查用户是否存在
  static async checkUserExists(userName: string): Promise<boolean> {
    try {
      const existingUser = await IncrementalUser.findOne({ userName });
      return !!existingUser;
    } catch (error) {
      console.error('检查用户是否存在失败:', error);
      throw new Error(
        `检查用户是否存在失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  // 添加增量用户（仅在不存在时创建）
  static async addIncrementalUser(userData: IncrementalUserData): Promise<IIncrementalUser> {
    try {
      // 检查用户是否已存在
      const userExists = await this.checkUserExists(userData.username);
      if (userExists) {
        throw new Error(`用户 ${userData.username} 已存在，无法重复创建`);
      }

      const incrementalUser = new IncrementalUser(userData);
      return await incrementalUser.save();
    } catch (error) {
      console.error('添加增量用户记录失败:', error);
      throw new Error(
        `添加增量用户记录失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  // 更新用户信息
  static async updateUser(
    userName: string,
    userData: Partial<IncrementalUserData>
  ): Promise<IIncrementalUser | null> {
    try {
      const userExists = await this.checkUserExists(userName);
      if (!userExists) {
        throw new Error(`用户 ${userName} 不存在，无法更新`);
      }
      return await IncrementalUser.findOneAndUpdate({ userName }, userData, { new: true });
    } catch (error) {
      console.error('更新增量用户记录失败:', error);
      throw new Error(
        `更新增量用户记录失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  // 删除用户
  static async deleteUser(userName: string): Promise<boolean> {
    const userExists = await this.checkUserExists(userName);
    if (userExists) {
      const result = await IncrementalUser.deleteOne({ userName });
      return result.deletedCount > 0;
    } else {
      throw new Error(`用户 ${userName} 不存在，无法删除`);
    }
  }
}

export default IncrementalUserService;
