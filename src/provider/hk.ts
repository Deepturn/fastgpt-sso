import type { RedirectFn, GetUserInfoFn, OrgListType, GetUserListFn, GetOrgListFn } from '../type';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { UserPrefix } from '../userPrefix';

type AccessToken = {
  value: string;
  expire: number;
};

/** Cached Access Token */
const access_token: {
  normal?: AccessToken;
  sync?: AccessToken;
} = {};

type userInfo = {
  username: string;
  memberName: string;
  avatar?: string;
  contact?: string;
  orgs: string[];
};

// SSO OAuth2.0 配置
const SSO_BASE_URL = process.env.HK_SSO_BASE_URL || 'https://passport-test.cethik.com';
const SSO_AUTHORIZE_URL = `${SSO_BASE_URL}/api/oauth/authorize`;
const SSO_TOKEN_URL = `${SSO_BASE_URL}/api/oauth/token`;
const SSO_USERINFO_URL = `${SSO_BASE_URL}/api/oauth/userinfo`;

const SSO_CLIENT_ID = process.env.HK_SSO_CLIENT_ID || '34';
const SSO_CLIENT_SECRET =
  process.env.HK_SSO_CLIENT_SECRET || 'NjOunPmsUV8kQAKlL6YaoS3VX2qJNqjfph4i';

// 缓存redirect_uri用于token交换
let cache_redirect_uri = '';

// HK API 配置
const HK_API_BASE_URL = process.env.HK_API_BASE_URL || 'https://ipaas-test.cethik.com';
const HK_API_TOKEN = process.env.HK_API_TOKEN || 'FL737zD3012ff147307c4Vs7767l6s3l';
const HK_ORG_CODE = process.env.HK_ORG_CODE ? process.env.HK_ORG_CODE.split(',') : ['1001'];

// HK API 接口地址
const HK_ORG_API_URL = `${HK_API_BASE_URL}/api/MDM/HdQueryPageOrgFast`;
const HK_DEPT_API_URL = `${HK_API_BASE_URL}/api/MDM/HdQueryPageDeptFast`;
const HK_USER_API_URL = `${HK_API_BASE_URL}/api/MDM/HdQueryPageInstituteFast`;

export const hk_redirectFn: RedirectFn = async ({ redirect_uri }) => {
  console.log('[hk_redirectFn] 输入参数:', { redirect_uri });
  //state 随机数
  const state = Math.random().toString(36).substring(2);

  // 构建OAuth2.0授权URL
  const url = new URL(SSO_AUTHORIZE_URL);
  url.searchParams.set('client_id', SSO_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirect_uri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid profile email phone');

  url.searchParams.set('state', state);

  // 缓存redirect_uri用于后续token交换
  cache_redirect_uri = redirect_uri;

  const redirectUrl = url.toString();
  console.log('[hk_redirectFn] 重定向URL:', redirectUrl);

  return { redirectUrl };
};

// 获取用户信息
export const hk_getUserInfo: GetUserInfoFn = async (code: string) => {
  console.log('[hk_getUserInfo] 开始处理用户信息:', { code: code.substring(0, 20) + '...' });

  try {
    // 1. 使用授权码换取access_token
    console.log('[hk_getUserInfo] 使用授权码换取access_token');
    const tokenResponse = await axios.request({
      url: SSO_TOKEN_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: SSO_CLIENT_ID,
        client_secret: SSO_CLIENT_SECRET,
        code,
        redirect_uri: cache_redirect_uri
      })
    });

    const { access_token } = tokenResponse.data;
    console.log('[hk_getUserInfo] 获取access_token成功:', {
      access_token: access_token.substring(0, 20) + '...'
    });

    // 2. 使用access_token获取用户信息
    console.log('[hk_getUserInfo] 使用access_token获取用户信息');
    const userInfoResponse = await axios.request({
      url: SSO_USERINFO_URL,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const userInfo = userInfoResponse.data;
    console.log('[hk_getUserInfo] 获取用户信息成功:', userInfo);

    // 3. 构建返回的用户信息
    const result = {
      username: `${UserPrefix.HK}-${userInfo.preferred_username || userInfo.sub}`,
      //memberName: userInfo.name || userInfo.preferred_username || userInfo.sub,
      avatar: userInfo.picture || '',
      contact: userInfo.email || userInfo.phone_number || ''
    };

    console.log('[hk_getUserInfo] 用户信息返回:', result);
    return result;
  } catch (error) {
    console.error('[hk_getUserInfo] 获取用户信息失败:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get user info: ${errorMessage}`);
  }
};

//获取组织列表
export const hk_getOrgList: GetOrgListFn = async () => {
  console.log('[hk_getOrgList] 开始获取组织列表:', { url: HK_ORG_API_URL, orgCodes: HK_ORG_CODE });
  const orgList: OrgListType = [];

  // 遍历所有组织编码
  for (const orgCode of HK_ORG_CODE) {
    console.log('[hk_getOrgList] 处理组织编码:', orgCode);

    // 1. 首先获取根组织信息
    const { data: orgData } = await axios.request<{
      success: boolean;
      message: string;
      orgList: Array<{
        id: string;
        name: string;
        parentId: string;
      }>;
      code: string;
    }>({
      url: HK_ORG_API_URL,
      method: 'POST',
      headers: {
        Authorization: HK_API_TOKEN,
        'Content-Type': 'application/json'
      },
      data: {
        orgCode: orgCode
      }
    });

    console.log('[hk_getOrgList] 组织API完整响应:', {
      orgCode,
      success: orgData.success,
      message: orgData.message,
      orgCount: orgData.orgList?.length,
      code: orgData.code,
      rawOrgData: JSON.stringify(orgData, null, 2)
    });

    if (!orgData.success || orgData.code !== '00000') {
      console.error('[hk_getOrgList] 组织API调用失败:', {
        orgCode,
        message: orgData.message,
        fullResponse: orgData
      });
      continue; // 跳过失败的组织编码，继续处理下一个
    }

    // 添加根组织
    const beforeOrgCount = orgList.length;
    orgData.orgList.forEach((org) => {
      // 检查是否已存在相同ID的组织，避免重复
      if (!orgList.find((existingOrg) => existingOrg.id === org.id)) {
        console.log('[hk_getOrgList] 添加根组织:', {
          id: org.id,
          name: org.name,
          parentId: org.parentId || '',
          orgCode: orgCode
        });
        orgList.push({
          id: org.id,
          name: org.name,
          parentId: org.parentId || ''
        });
      } else {
        console.warn('[hk_getOrgList] 跳过重复的根组织:', { id: org.id, name: org.name });
      }
    });
    const afterOrgCount = orgList.length;
    console.log('[hk_getOrgList] 根组织添加完成:', {
      orgCode,
      beforeCount: beforeOrgCount,
      afterCount: afterOrgCount,
      addedCount: afterOrgCount - beforeOrgCount,
      expectedCount: orgData.orgList?.length || 0
    });

    // 2. 获取部门信息（分页获取）
    let page = 0;
    const size = 100;
    let hasMore = true;
    let totalDeptsFetched = 0;
    let totalDeptsAdded = 0;

    while (hasMore) {
      console.log('[hk_getOrgList] 获取部门数据:', {
        orgCode,
        page,
        currentOrgListSize: orgList.length
      });
      const { data: deptData } = await axios.request<{
        success: boolean;
        message: string;
        totalElements: number;
        totalPages: number;
        orgList: Array<{
          id: string;
          name: string;
          parentId: string;
        }>;
        code: string;
      }>({
        url: HK_DEPT_API_URL,
        method: 'POST',
        headers: {
          Authorization: HK_API_TOKEN,
          'Content-Type': 'application/json'
        },
        data: {
          page,
          size,
          orgCode: orgCode
        }
      });

      console.log('[hk_getOrgList] 部门API完整响应:', {
        orgCode,
        success: deptData.success,
        message: deptData.message,
        totalElements: deptData.totalElements,
        totalPages: deptData.totalPages,
        deptCount: deptData.orgList?.length,
        code: deptData.code,
        page,
        rawDeptData: JSON.stringify(deptData, null, 2)
      });

      if (!deptData.success || deptData.code !== '00000') {
        console.error('[hk_getOrgList] 部门API调用失败:', {
          orgCode,
          message: deptData.message,
          page,
          fullResponse: deptData
        });
        break; // 跳出当前组织的部门获取循环
      }

      console.log('[hk_getOrgList] 检查部门数据完整性:', {
        orgCode,
        page,
        expectedDepts: deptData.orgList?.length || 0,
        totalElementsFromAPI: deptData.totalElements,
        totalPagesFromAPI: deptData.totalPages,
        currentPageDepts:
          deptData.orgList?.map((d) => ({ id: d.id, name: d.name, parentId: d.parentId })) || []
      });

      const beforeDeptCount = orgList.length;
      let pageDeptsAdded = 0;

      // 添加部门数据
      deptData.orgList.forEach((dept) => {
        totalDeptsFetched++;
        // 检查是否已存在相同ID的部门，避免重复
        if (!orgList.find((existingOrg) => existingOrg.id === dept.id)) {
          console.log('[hk_getOrgList] 添加部门:', {
            id: dept.id,
            name: dept.name,
            parentId: dept.parentId || '',
            orgCode: orgCode,
            page: page
          });
          orgList.push({
            id: dept.id,
            name: dept.name,
            parentId: dept.parentId || ''
          });
          pageDeptsAdded++;
          totalDeptsAdded++;
        } else {
          console.warn('[hk_getOrgList] 跳过重复的部门:', { id: dept.id, name: dept.name, page });
        }
      });

      const afterDeptCount = orgList.length;
      console.log('[hk_getOrgList] 当前页部门处理完成:', {
        orgCode,
        page,
        beforeCount: beforeDeptCount,
        afterCount: afterDeptCount,
        pageDeptsAdded,
        expectedPageDepts: deptData.orgList?.length || 0,
        totalDeptsFetched,
        totalDeptsAdded
      });

      // 检查是否还有更多页
      page++;
      hasMore = page < deptData.totalPages;

      console.log('[hk_getOrgList] 分页状态检查:', {
        orgCode,
        currentPage: page - 1,
        nextPage: page,
        totalPages: deptData.totalPages,
        hasMore,
        totalElementsExpected: deptData.totalElements,
        totalDeptsFetched,
        totalDeptsAdded
      });
    }

    console.log('[hk_getOrgList] 组织编码处理完成:', {
      orgCode,
      totalDeptsFetched,
      totalDeptsAdded,
      currentOrgListSize: orgList.length
    });
  }

  // 最终数据完整性检查
  const finalStats = {
    totalOrgs: orgList.length,
    orgsByParentId: orgList.reduce(
      (acc, org) => {
        const parentId = org.parentId || 'root';
        acc[parentId] = (acc[parentId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    duplicateIds: orgList.reduce(
      (acc, org, index) => {
        const duplicateIndex = orgList.findIndex((o, i) => i !== index && o.id === org.id);
        if (duplicateIndex !== -1) {
          acc.push({ id: org.id, name: org.name, indices: [index, duplicateIndex] });
        }
        return acc;
      },
      [] as Array<{ id: string; name: string; indices: number[] }>
    ),
    emptyNames: orgList.filter((org) => !org.name || org.name.trim() === ''),
    emptyIds: orgList.filter((org) => !org.id || org.id.trim() === '')
  };

  console.log('[hk_getOrgList] 最终数据完整性报告:', {
    ...finalStats,
    sampleOrgs: orgList
      .slice(0, 5)
      .map((org) => ({ id: org.id, name: org.name, parentId: org.parentId })),
    allOrgIds: orgList.map((org) => org.id)
  });

  if (finalStats.duplicateIds.length > 0) {
    console.error('[hk_getOrgList] 发现重复ID:', finalStats.duplicateIds);
  }

  if (finalStats.emptyNames.length > 0) {
    console.error('[hk_getOrgList] 发现空名称组织:', finalStats.emptyNames);
  }

  if (finalStats.emptyIds.length > 0) {
    console.error('[hk_getOrgList] 发现空ID组织:', finalStats.emptyIds);
  }

  console.log('[hk_getOrgList] 组织列表处理完成:', { count: orgList.length });

  return orgList;
};

//获取用户列表
export const hk_getUserList: GetUserListFn = async () => {
  console.log('[hk_getUserList] 开始获取用户列表:', {
    url: HK_USER_API_URL,
    orgCodes: HK_ORG_CODE
  });
  const allUsers: Array<{
    username: string;
    memberName: string;
    avatar?: string;
    contact?: string;
    orgs: string[];
  }> = [];

  // 遍历所有组织编码
  for (const orgCode of HK_ORG_CODE) {
    console.log('[hk_getUserList] 处理组织编码:', orgCode);

    // 分页获取用户数据
    let page = 0;
    const size = 100;
    let hasMore = true;

    while (hasMore) {
      console.log('[hk_getUserList] 获取用户数据:', { orgCode, page });
      const { data } = await axios.request<{
        success: boolean;
        message: string;
        totalElements: number;
        totalPages: number;
        userList: Array<{
          username: string;
          memberName: string;
          orgs: string[];
        }>;
        code: string;
      }>({
        url: HK_USER_API_URL,
        method: 'POST',
        headers: {
          Authorization: HK_API_TOKEN,
          'Content-Type': 'application/json'
        },
        data: {
          page,
          size,
          orgCode: orgCode
        }
      });

      console.log('[hk_getUserList] API响应:', {
        orgCode,
        success: data.success,
        message: data.message,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
        userCount: data.userList?.length,
        code: data.code,
        page
      });

      if (!data.success || data.code !== '00000') {
        console.error('[hk_getUserList] API调用失败:', { orgCode, message: data.message });
        break; // 跳出当前组织的用户获取循环
      }

      // 添加当前页的用户数据
      data.userList.forEach((user) => {
        // 检查是否已存在相同用户名的用户，避免重复
        const existingUser = allUsers.find(
          (existingUser) => existingUser.username === user.username
        );
        if (!existingUser) {
          allUsers.push({
            username: user.username,
            memberName: user.memberName,
            avatar: '',
            contact: '',
            orgs: user.orgs || []
          });
          console.log({
            username: user.username,
            memberName: user.memberName,
            avatar: '',
            contact: '',
            orgs: user.orgs || []
          });
        } else {
          // 如果用户已存在，合并组织信息
          const newOrgs = user.orgs || [];
          existingUser.orgs = [...new Set([...existingUser.orgs, ...newOrgs])];
        }
      });

      // 检查是否还有更多页
      page++;
      hasMore = page < data.totalPages;
    }
  }

  // 转换数据并添加前缀
  console.log('[hk_getUserList] 开始转换用户数据:', { originalCount: allUsers.length });
  const transformedUsers = allUsers.map((user) => ({
    username: `${UserPrefix.HK}-${user.username}`,
    memberName: user.memberName || user.username, // 如果没有 memberName 则使用 username
    avatar: user.avatar || '',
    contact: user.contact || '',
    orgs: user.orgs || []
  }));

  // 逐条打印用户信息
  console.log('[hk_getUserList] 用户列表更新完成，共', transformedUsers.length, '个用户:');
  transformedUsers.forEach((user, index) => {
    console.log(`[hk_getUserList] 用户${index + 1}:`, {
      username: user.username,
      memberName: user.memberName,
      orgs: user.orgs.toString()
    });
  });

  return transformedUsers;
};
