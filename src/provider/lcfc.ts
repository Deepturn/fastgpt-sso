// OAUTH2.0 Authorization reference: https://www.ruanyifeng.com/blog/2014/05/oauth_2_0.html
import axios from 'axios';
import type { GetUserInfoFn, RedirectFn, GetUserListFn, GetOrgListFn, UserListType } from 'type';
import { UserPrefix } from 'userPrefix';
import type { IncrementalUserData } from '../database/model/incrementalUser';
import { get } from 'http';

const { FastGPTUserService } = await import('../database');

const OAuth2AuthorizeURL = process.env.OAUTH2_AUTHORIZE_URL || '';
const OAuth2TokenURL = process.env.OAUTH2_TOKEN_URL || '';
const OAuth2UserInfoURL = process.env.OAUTH2_USER_INFO_URL || '';

const ClientID = process.env.OAUTH2_CLIENT_ID || '';
const ClientSecret = process.env.OAUTH2_CLIENT_SECRET || '';
const Scope = process.env.OAUTH2_SCOPE || '';

const OAuth2UsernameMap = process.env.OAUTH2_USERNAME_MAP || '';
const OAuth2AvatarMap = process.env.OAUTH2_AVATAR_MAP || '';
const OAuth2MemberNameMap = process.env.OAUTH2_MEMBER_NAME_MAP || '';
const OAuth2ContactMap = process.env.OAUTH2_CONTACT_MAP || '';

const userAuthcode = process.env.USERAUTHCODE || 'QUlBUC1hcHBrZXkjQGF1dGhAIzR3eDBQQTli';
const userCode = process.env.USERCODE || '2025082913511688';
const orgAuthcode = process.env.ORGAUTHCODE || 'QUlBUC1hcHBrZXkjQGF1dGhAIzR3eDBQQTli';
const orgCode = process.env.ORGCODE || '2025082913511688';

const userListUrl = process.env.USERLISTURL || '/esb/lcfc/GetPersons';
const orgListUrl = process.env.ORGLISTURL || '/esb/lcfc/GetSegments';
const baseUrl = process.env.BASEURL || 'http://esbprd.lcfuturecenter.com:8888';
//const urlToken = process.env.URLTOKEN || ''
const hcpAdmin = process.env.HCPADMIN || 'hcpadmin';
const hcpPassword = process.env.HCPPASSWORD || 'hcp.admin';
let cache_redirect_uri = '';

function getNestedValue(obj: any, path: string): any {
  if (!path) return undefined;

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

export const lcfc_oauth2_redirectFn: RedirectFn = async ({ redirect_uri, state }) => {
  // parse the redirect_uri
  const url = new URL(OAuth2AuthorizeURL);
  url.searchParams.set('redirect_uri', redirect_uri);
  url.searchParams.set('client_id', ClientID);
  url.searchParams.set('response_type', 'code');
  if (Scope) {
    url.searchParams.set('scope', Scope);
  }
  if (state) {
    url.searchParams.set('state', state);
  }

  cache_redirect_uri = redirect_uri;
  return {
    redirectUrl: url.toString()
  };
};

export const lcfc_oauth2_getUserInfo: GetUserInfoFn = async (code: string) => {
  const {
    data: { access_token }
  } = await axios.request({
    url: OAuth2TokenURL,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: ClientID,
      code,
      redirect_uri: cache_redirect_uri,
      ...(ClientSecret ? { client_secret: ClientSecret } : {})
    })
  });

  const { data } = await axios.request({
    url: OAuth2UserInfoURL,
    method: 'get',
    headers: {
      Authorization: `Bearer ${access_token}`
    }
  });

  const username = getNestedValue(data, OAuth2UsernameMap);
  const avatar = getNestedValue(data, OAuth2AvatarMap);
  const memberName = getNestedValue(data, OAuth2MemberNameMap);
  const contact = getNestedValue(data, OAuth2ContactMap);

  return {
    username,
    avatar,
    memberName,
    contact
  };
};

export const lcfc_getUserList: GetUserListFn = async () => {
  console.log('<lcfc_getUserList>:incrementalData start');
  const incrementalData: UserListType = await FastGPTUserService.getIncrementalUsersSso();
  console.log('<lcfc_getUserList>:incrementalData : ', incrementalData);

  const getUserListURL = new URL(userListUrl, baseUrl);
  getUserListURL.searchParams.set('authcode', userAuthcode);
  getUserListURL.searchParams.set('code', userCode);
  const bearToken = Buffer.from(hcpAdmin + ':' + hcpPassword, 'utf-8').toString('base64');
  console.log('<lcfc_getUserList>:req start');
  const response = await axios.request<{
    code: string;
    message: string;
    data: Array<{
      UserId: string;
      NameSz: string;
      IdNoSz: string;
      SegmentNoSz: string;
      SuperMgtId: string;
    }>;
  }>({
    url: getUserListURL.toString(),
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${bearToken}`
    }
  });
  console.log('<lcfc_getUserList>:req end');
  const hcpData = response.data.data.map((user) => ({
    username: `${UserPrefix.LCFC}-${user.IdNoSz}`,
    memberName: user.NameSz || user.IdNoSz,
    avatar: '',
    contact: '',
    orgs: [user.SegmentNoSz]
  }));
  // console.log('<lcfc_getUserList>:check hcpData : ', hcpData);

  const data = [...hcpData, ...incrementalData];

  // console.log('<lcfc_getUserList>:check data : ', data);

  return data;
};

export const lcfc_getOrgList: GetOrgListFn = async () => {
  const getOrglistURL = new URL(orgListUrl, baseUrl);
  getOrglistURL.searchParams.set('authcode', orgAuthcode);
  getOrglistURL.searchParams.set('code', orgCode);

  const bearToken = Buffer.from(hcpAdmin + ':' + hcpPassword, 'utf-8').toString('base64');

  console.log('<lcfc_getOrgList>:req start');
  const response = await axios.request<{
    code: string;
    message: string;
    data: Array<{
      segmentshortname: string;
      SegmentNo: string;
      SegmentName: string;
      ParentSegmentNo: string;
      SegSegmentNo: string;
      ManagerID: string;
      DeptMgtCode: string;
      SegmentEName: string;
      ShortName: string;
    }>;
  }>({
    url: getOrglistURL.toString(),
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${bearToken}`
    }
  });

  console.log('<lcfc_getOrgList>:req end');

  


  

  const allData = response.data.data.map((org) => ({
    id: org.SegmentNo,
    name: org.SegmentName,
    parentId: org.ParentSegmentNo
  }));

  const rootOrg = allData.find((org) => org.parentId === '');


  const tempOrg = {id:'10086',name:'HCP_TEMP_ORG',parentId:rootOrg?.id||''}

  console.log('<lcfc_getOrgList>: 临时部门',tempOrg)


  // console.log('<lcfc_getOrgList>:check data : ', allData);

  const data = [...allData,tempOrg]

  return data;
};
