import mongoose from "mongoose";
import type { lcfcUser, UserListType } from "../type";
import IncrementalUser from "../database/model/incrementalUser";
import type { IncrementalUserData } from "../database/model/incrementalUser";
/**
 * FastGPT用户数据转换服务
 * 从FastGPT数据库获取用户数据并转换为lcfcUser格式
 */
export class FastGPTUserService {
  /**
   * 获取用户列表并转换为lcfcUser格式
   * @param isIncremental 是否为增量用户数据
   * @returns lcfcUser数组
   */
  static async getUserList(
    isIncremental: boolean = false
  ): Promise<lcfcUser[]> {
    try {
      // 确保数据库连接
      if (!mongoose.connection.readyState) {
        throw new Error("数据库连接未就绪");
      }

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("数据库连接对象不可用");
      }

      // 联合查询获取用户信息
      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $lookup: {
            from: "teams",
            localField: "teamId",
            foreignField: "_id",
            as: "teamInfo",
          },
        },
        {
          $unwind: "$userInfo",
        },
        {
          $unwind: "$teamInfo",
        },
        {
          $match: {
            "userInfo.status": "active", // 只获取活跃用户
          },
        },
      ];

      const teamMembers = await db
        .collection("team_members")
        .aggregate(pipeline)
        .toArray();

      // 转换数据格式
      const lcfcUsers: lcfcUser[] = teamMembers.map((member) =>
        this.transformToLcfcUser(member, isIncremental)
      );

      return lcfcUsers;
    } catch (error) {
      console.error("获取FastGPT用户列表失败:", error);
      throw error;
    }
  }

  /**
   * 将FastGPT用户数据转换为lcfcUser格式
   * @param fastgptUser FastGPT用户数据
   * @param isIncremental 是否为增量用户
   * @returns lcfcUser对象
   */
  private static transformToLcfcUser(
    fastgptUser: any,
    isIncremental: boolean
  ): lcfcUser {
    // 处理username，移除前缀
    const processUsername = (username: string): string => {
      if (!username) return "";

      if (username.includes("-")) {
        return username.split("-")[1];
      }

      // 其他前缀处理逻辑可以在这里添加
      return username;
    };

    // 处理状态映射
    const mapStatus = (status: string): string => {
      switch (status) {
        case "active":
          return "在职";
        case "inactive":
          return "离职";
        default:
          return "未知";
      }
    };

    // 格式化创建时间
    const formatCreateTime = (createTime: Date | string): string => {
      if (!createTime) return "";

      const date = new Date(createTime);
      return date.toISOString().split("T")[0]; // 返回YYYY-MM-DD格式
    };

    return {
      name: fastgptUser.name || "Member",
      acctName: fastgptUser.name || "Member",
      key: processUsername(fastgptUser.userInfo?.username || ""),
      status: mapStatus(fastgptUser.status || "active"),
      isPublic: "0", // 增量用户为0，非增量为1
      isPartners: "0", // 增量用户为1，非增量为0
      period: "长期有效",
      createTime: formatCreateTime(fastgptUser.userInfo?.createTime || ""),
      disableTime: "",
    };
  }

  /**
   * 获取增量用户列表
   * @returns lcfcUser数组
   */
  static async getIncrementalUsers(): Promise<lcfcUser[]> {
    try {
      // 查询增量用户表，而不是team_members表
      const incrementalUsers = await IncrementalUser.find({}).lean();

      // 转换数据格式
      const lcfcUsers: lcfcUser[] = incrementalUsers.map((user) =>
        this.transformIncrementalUserToLcfcUser(user)
      );

      return lcfcUsers;
    } catch (error) {
      console.error("获取增量用户列表失败:", error);
      throw error;
    }
  }

  /**
   * 将增量用户数据转换为lcfcUser格式
   * @param incrementalUser 增量用户数据
   * @returns lcfcUser对象
   */
  private static transformIncrementalUserToLcfcUser(
    incrementalUser: any
  ): lcfcUser {
    return {
      name: incrementalUser.memberName || "Member",
      acctName: incrementalUser.memberName || "Member",
      key: incrementalUser.username,
      status: "在职", // 增量用户默认为在职状态
      isPublic: "0", // 增量用户为0
      isPartners: "0", // 增量用户为1
      period: "长期有效",
      createTime: incrementalUser.createdAt
        ? new Date(incrementalUser.createdAt).toISOString().split("T")[0]
        : "",
      disableTime: "",
    };
  }

  /**
   * 获取增量用户列表
   * @returns fastgpt数组
   */
  static async getIncrementalUsersSso(): Promise<UserListType> {
    try {
      // 查询增量用户表，而不是team_members表
      const incrementalUsers = await IncrementalUser.find({}).lean();

      // 先过滤出 status 为 active 的用户
      const activeUsers = incrementalUsers.filter(
        (user) => user.status === "active"
      );

      // 然后映射并去掉 status 字段
      const lcfcUsers: UserListType = activeUsers.map(
        ({ username, memberName, avatar, contact, orgs }) => ({
          username,
          memberName,
          avatar,
          contact,
          orgs,
        })
      );

      return lcfcUsers;
    } catch (error) {
      console.error("获取增量用户列表失败:", error);
      throw error;
    }
  }

  /**
   * 获取数据库中所有用户列表
   * @returns lcfcUser数组
   */
  static async getRegularUsers(): Promise<lcfcUser[]> {
    return this.getUserList(false);
  }

  /**
   * 获取所有用户列表（包含增量和非增量）
   * @returns lcfcUser数组
   */
  static async getAllUsers(): Promise<lcfcUser[]> {
    try {
      const [regularUsers, incrementalUsers] = await Promise.all([
        this.getRegularUsers(),
        this.getIncrementalUsers(),
      ]);

      // 创建incrementalUsers的key到用户信息的映射
      const incrementalUserMap = new Map<string, lcfcUser>();

      incrementalUsers.forEach(user => {
        incrementalUserMap.set(user.key, user);
      });

      // 使用incrementalUsers的信息更新regularUsers中对应用户
      const updatedRegularUsers = regularUsers.map(user => {
        const incrementalUser = incrementalUserMap.get(user.key);
        if (incrementalUser) {
          // 如果增量用户存在且status为"在职"(对应active状态)
          if (incrementalUser.status === "forbidden") {
            return {
              ...user,
              status: "离职", // 用incrementalUsers的最新status覆盖
              isPublic: "0", // 增量用户且active状态时设为0
              isPartners: "0" // 增量用户且active状态时设为1
            };
          } else {
            // 增量用户存在但不是active状态
            return {
              ...user,
              status: incrementalUser.status
            };
          }
        }
        return user;
      });

      //剔除updatedRegularUsers中的root 
      const filteredUsers = updatedRegularUsers.filter(user => user.key !== 'root');
      return filteredUsers;

      //return updatedRegularUsers;
    } catch (error) {
      console.error("获取所有用户列表失败:", error);
      throw error;
    }
  }
}
