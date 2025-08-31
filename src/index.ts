import express from 'express';
import { initGlobalStore } from 'global';
import { initializeDatabase, closeDatabaseConnection } from './database';

import { initTestSaml } from 'provider/testSaml';
import { init_bjsf } from 'provider/bjsf';
import {
  handleGetAuthUrl,
  handleCallback,
  handleGetUserInfo,
  handleGetUserList,
  handleGetOrgList,
  handleSAMLMetadata,
  handleSAMLAssert,
  handleIncrementalUsers,
  handleUserList
} from 'controllers';
import { auth } from 'middleware';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 3000;

// 接收重定向请求
app.get('/login/oauth/getAuthURL', handleGetAuthUrl);
app.get('/login/oauth/getUserInfo', handleGetUserInfo);
// 用作处理特殊的重定向请求
app.get('/login/oauth/callback', handleCallback);
// 获取用户身份信息
app.get('/user/list', auth, handleGetUserList);
app.get('/org/list', auth, handleGetOrgList);

// 测试
app.get('/test', async (req, res) => {
  res.send('FastGPT-SSO-Service');
});

// SAML2.0 Support
app.get('/login/saml/metadata.xml', handleSAMLMetadata);
app.post('/login/saml/assert', handleSAMLAssert);

//全量数据验证接口
app.get('/user/all/list', handleUserList);

//增量用户数据接口
app.post('/user/incremental', handleIncrementalUsers);

// 启动服务器
const startServer = async () => {
  try {
    // 初始化数据库连接
    console.log('init db start');
    await initializeDatabase();
    console.log('init db end');

    app.listen(PORT, () => {
      const provider = process.env.SSO_PROVIDER;
      console.log('Provider', provider);

      console.log(`SSO server is running on http://localhost:${PORT}`);
      initGlobalStore();
      if (provider === 'testSaml') {
        initTestSaml();
      } else if (provider === 'bjsf') {
        init_bjsf();
      }
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
};

// 优雅关闭处理
const gracefulShutdown = async (signal: string) => {
  console.log(`收到 ${signal} 信号，开始优雅关闭...`);

  try {
    // 关闭数据库连接
    await closeDatabaseConnection();
    console.log('服务器已优雅关闭');
    process.exit(0);
  } catch (error) {
    console.error('关闭服务器时出错:', error);
    process.exit(1);
  }
};

// 监听进程信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 启动服务器
startServer();

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
  console.error('Promise:', promise);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  gracefulShutdown('uncaughtException');
});
