# FastGPT 项目数据库表结构详细文档

## 概述

FastGPT 项目采用混合数据库架构：
- **主数据库**: MongoDB (NoSQL) - 存储业务数据
- **向量数据库**: PostgreSQL/OceanBase - 存储向量数据用于知识库检索
- **架构特点**: 多租户设计，基于 teamId 实现数据隔离

---

## MongoDB 表（集合）结构

### 1. 用户相关

#### users (用户表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/support/user/schema.ts`
- **集合名称**: `users`
- **字段详情**:
  - `_id`: ObjectId - 用户唯一标识
  - `status`: String - 用户状态 (active/inactive)
  - `username`: String - 用户名/手机/邮箱 (唯一)
  - `phonePrefix`: Number - 手机号前缀
  - `password`: String - 密码 (加密存储)
  - `passwordUpdateTime`: Date - 密码更新时间
  - `createTime`: Date - 创建时间
  - `promotionRate`: Number - 推广费率 (默认0)
  - `openaiAccount`: Object - OpenAI账户配置 {key, baseUrl}
  - `timezone`: String - 时区 (默认Asia/Shanghai)
  - `lastLoginTmbId`: ObjectId - 最后登录的团队成员ID
  - `inviterId`: ObjectId - 邀请人ID
  - `fastgpt_sem`: Object - SEM相关数据
  - `sourceDomain`: String - 来源域名
  - `contact`: String - 联系方式
  - `avatar`: String - 头像 (已废弃)

#### user_notifications (用户通知表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/projects/app/src/service/support/user/inform/schema.ts`
- **集合名称**: `inform`
- **关联**: 关联 users 表和 team 表

**字段说明**:
- `_id`: ObjectId - 通知唯一标识符
- `userId`: ObjectId - 用户ID，关联users表，必填
- `teamId`: ObjectId - 团队ID，关联team表，可选
- `time`: Date - 通知创建时间，默认当前时间
- `level`: String - 通知级别，枚举值：
  - `common`: 普通通知
  - `important`: 重要通知
  - `emergency`: 紧急通知
- `title`: String - 通知标题，必填
- `content`: String - 通知内容，必填
- `read`: Boolean - 是否已读，默认false

**索引**:
- `{ userId: 1, read: 1 }` - 用户已读状态索引
- `{ userId: 1, time: -1 }` - 用户时间倒序索引
- `{ time: 1 }` - 时间索引，TTL过期时间365天

#### operationLogs (用户操作审计日志表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/support/user/audit/schema.ts`
- **集合名称**: `operationLogs`
- **关联**: 关联 team_members 表和 teams 表

**字段说明**:
- `_id`: ObjectId - 日志唯一标识符
- `tmbId`: ObjectId - 团队成员ID，关联team_members表，必填
- `teamId`: ObjectId - 团队ID，关联teams表，必填
- `timestamp`: Date - 操作时间戳，默认当前时间
- `event`: String - 操作事件类型，枚举值包括但不限于：
  - 用户操作事件：登录、创建应用、更新应用、删除应用等
  - 管理员操作事件：系统配置更新、用户管理等
- `metadata`: Object - 操作元数据，存储操作相关的额外信息，默认空对象

**索引**:
- `{ teamId: 1, tmbId: 1, event: 1 }` - 团队成员事件复合索引
- `{ timestamp: 1 }` - 时间索引，TTL过期时间14天

### 2. 团队组织

#### team_orgs (团队组织表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/support/permission/org/orgSchema.ts`
- **集合名称**: `team_orgs`
- **字段详情**:
  - `_id`: ObjectId - 组织唯一标识
  - `teamId`: ObjectId - 关联团队ID
  - `pathId`: String - 路径ID (唯一标识)
  - `path`: String - 组织路径
  - `name`: String - 组织名称
  - `avatar`: String - 组织头像
  - `description`: String - 组织描述
  - `updateTime`: Date - 更新时间 (自动维护)

#### team_org_members (团队组织成员表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/support/permission/org/orgMemberSchema.ts`
- **集合名称**: `team_org_members`
- **字段详情**:
  - `_id`: ObjectId - 组织成员记录唯一标识
  - `teamId`: ObjectId - 团队ID
  - `orgId`: ObjectId - 组织ID
  - `tmbId`: ObjectId - 团队成员ID
- **索引**: 支持 (teamId, orgId, tmbId) 唯一索引
- **关联**: 关联 teams, team_orgs, team_members 表

#### teams (团队表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/support/user/team/teamSchema.ts`
- **集合名称**: `teams`
- **字段详情**:
  - `_id`: ObjectId - 团队唯一标识
  - `name`: String - 团队名称
  - `ownerId`: ObjectId - 团队所有者ID
  - `avatar`: String - 团队头像 (默认/icon/logo.svg)
  - `createTime`: Date - 创建时间
  - `balance`: Number - 账户余额
  - `teamDomain`: String - 团队域名
  - `limit`: Object - 限制配置 {lastExportDatasetTime, lastWebsiteSyncTime}
  - `lafAccount`: Object - Laf账户配置 {token, appid, pat}
  - `openaiAccount`: Object - OpenAI账户配置 {key, baseUrl}
  - `externalWorkflowVariables`: Object - 外部工作流变量
  - `notificationAccount`: String - 通知账户
- **关联**: 关联 users 表

#### team_members (团队成员表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/support/user/team/teamMemberSchema.ts`
- **集合名称**: `team_members`
- **字段详情**:
  - `_id`: ObjectId - 团队成员唯一标识
  - `teamId`: ObjectId - 团队ID
  - `userId`: ObjectId - 用户ID
  - `avatar`: String - 成员头像 (随机生成)
  - `name`: String - 成员名称 (默认'Member')
  - `status`: String - 成员状态 (枚举值)
  - `createTime`: Date - 创建时间
  - `updateTime`: Date - 更新时间
  - `role`: String - 角色 (已废弃)
  - `defaultTeam`: Boolean - 是否默认团队 (已废弃)
- **关联**: 关联 teams 和 users 表

#### team_tags (团队标签表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/support/user/team/teamTagsSchema.ts`
- **集合名称**: `team_tags`
- **关联**: 关联 teams 表
- **字段说明**:
  - `teamId`: ObjectId类型，必填，关联teams表的_id字段，表示标签所属的团队
  - `key`: String类型，必填，标签的唯一标识键值
  - `label`: String类型，必填，标签的显示名称
  - `createTime`: Date类型，默认当前时间，标签创建时间
- **索引**: teamId字段建立索引，用于快速查询团队下的标签

#### team_subscriptions (团队订阅表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/support/wallet/sub/schema.ts`
- **集合名称**: `team_subscriptions`
- **关联**: 关联 teams 表
- **字段说明**:
  - `teamId`: ObjectId类型，必填，关联teams表的_id字段，表示订阅所属的团队
  - `type`: String类型，必填，订阅类型枚举值（standard/extraDatasetSize/extraPoints）
  - `startTime`: Date类型，默认当前时间，订阅开始时间
  - `expiredTime`: Date类型，必填，订阅过期时间
  - `currentMode`: String类型，当前订阅模式枚举值
  - `nextMode`: String类型，下一个订阅模式枚举值
  - `currentSubLevel`: String类型，当前订阅等级枚举值
  - `nextSubLevel`: String类型，下一个订阅等级枚举值
  - `maxTeamMember`: Number类型，最大团队成员数限制
  - `maxApp`: Number类型，最大应用数限制
  - `maxDataset`: Number类型，最大数据集数限制
  - `totalPoints`: Number类型，计划总积分数
  - `surplusPoints`: Number类型，剩余积分数
  - `currentExtraDatasetSize`: Number类型，当前额外数据集大小
- **索引**: 多个复合索引用于查询优化，包括过期时间、团队ID、订阅类型等

#### team_member_groups (团队成员组表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/support/permission/memberGroup/memberGroupSchema.ts`
- **集合名称**: `team_member_groups`
- **关联**: 关联 teams 表
- **字段说明**:
  - `teamId`: ObjectId类型，必填，关联teams表的_id字段，表示成员组所属的团队
  - `name`: String类型，必填，成员组名称
  - `avatar`: String类型，可选，成员组头像URL
  - `updateTime`: Date类型，默认当前时间，自动更新时间戳
- **索引**: teamId和name字段建立唯一复合索引，确保同一团队内成员组名称唯一

#### team_group_members (组成员表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/support/permission/memberGroup/groupMemberSchema.ts`
- **集合名称**: `team_group_members`
- **关联**: 关联 team_member_groups 表和 team_members 表
- **字段说明**:
  - `groupId`: ObjectId类型，必填，关联team_member_groups表的_id字段，表示所属成员组
  - `tmbId`: ObjectId类型，必填，关联team_members表的_id字段，表示团队成员
  - `role`: String类型，必填，成员在组内的角色枚举值，默认为member
- **索引**: groupId和tmbId字段分别建立索引，用于快速查询
- **虚拟字段**: group字段关联到成员组信息

#### team_invitation_links (团队邀请链接表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/projects/app/src/service/support/user/team/invitationLink/schema.ts`
- **集合名称**: `team_invitation_links`
- **关联**: 关联 teams 表
- **字段说明**:
  - `linkId`: String类型，唯一，默认生成nanoid，邀请链接的唯一标识
  - `teamId`: ObjectId类型，必填，关联teams表的_id字段，表示邀请链接所属的团队
  - `usedTimesLimit`: Number类型，默认1，使用次数限制（1表示单次使用，-1表示无限制）
  - `forbidden`: Boolean类型，是否禁用该邀请链接
  - `expires`: Date类型，邀请链接过期时间
  - `description`: String类型，邀请链接描述信息
  - `members`: Array类型，默认空数组，已使用该链接的成员列表
- **索引**: teamId字段建立索引，expires字段建立TTL索引（30天后自动删除）
- **虚拟字段**: team字段关联到团队信息

#### team_Invoice_titles (团队发票抬头表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/projects/app/src/service/support/user/team/invoiceAccount/teamInvoiceSchema.ts`
- **集合名称**: `team_Invoice_titles`
- **关联**: 关联 teams 表
- **字段说明**:
  - `teamId`: ObjectId类型，必填，关联teams表的_id字段，表示发票抬头所属的团队
  - `teamName`: String类型，必填，团队/公司名称
  - `unifiedCreditCode`: String类型，必填，统一社会信用代码
  - `companyAddress`: String类型，可选，公司地址
  - `companyPhone`: String类型，可选，公司电话
  - `bankName`: String类型，可选，开户银行名称
  - `bankAccount`: String类型，可选，银行账号
  - `needSpecialInvoice`: Boolean类型，必填，默认false，是否需要专用发票
  - `contactPhone`: String类型，可选，联系电话
  - `emailAddress`: String类型，必填，邮箱地址
- **索引**: teamId字段建立索引，用于快速查询团队的发票信息

### 3. 应用相关

#### apps (应用表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/core/app/schema.ts`
- **集合名称**: `apps`
- **字段详情**:
  - `_id`: ObjectId - 应用唯一标识
  - `parentId`: ObjectId - 父应用ID
  - `teamId`: ObjectId - 团队ID
  - `tmbId`: ObjectId - 团队成员ID
  - `name`: String - 应用名称
  - `type`: String - 应用类型 (workflow等)
  - `version`: String - 版本 (v1/v2)
  - `avatar`: String - 应用头像
  - `intro`: String - 应用介绍
  - `updateTime`: Date - 更新时间
  - `teamTags`: [String] - 团队标签
  - `modules`: Array - 模块配置
  - `edges`: Array - 连接配置
  - `chatConfig`: Object - 聊天配置
  - `pluginData`: Object - 插件数据
  - `scheduledTriggerConfig`: Object - 定时触发配置
  - `scheduledTriggerNextTime`: Date - 下次触发时间
  - `inited`: Boolean - 是否已初始化
  - `inheritPermission`: Boolean - 是否继承权限
  - `defaultPermission`: Number - 默认权限
- **关联**: 关联 teams, team_members 表

#### app_versions (应用版本表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/core/app/version/schema.ts`
- **集合名称**: `app_versions`
- **关联**: 关联 apps 表
- **字段说明**:
  - `tmbId`: 团队成员ID，关联团队成员表，必填字段
  - `appId`: 应用ID，关联应用版本表，必填字段
  - `time`: 版本创建时间，默认为当前时间
  - `nodes`: 工作流节点数组，默认为空数组
  - `edges`: 工作流连接线数组，默认为空数组
  - `chatConfig`: 聊天配置对象
  - `isPublish`: 是否发布，布尔值
  - `versionName`: 版本名称，字符串类型
- **索引**: `{ appId: 1, time: -1 }` - 按应用ID升序和时间降序建立复合索引

#### app_templates (应用模板表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/core/app/templates/templateSchema.ts`
- **集合名称**: `app_templates`
- **字段说明**:
  - `templateId`: 模板唯一标识ID，必填字段
  - `name`: 模板名称，字符串类型
  - `intro`: 模板介绍/描述，字符串类型
  - `avatar`: 模板头像/图标，字符串类型
  - `author`: 模板作者，字符串类型
  - `tags`: 模板标签数组，字符串数组，默认为undefined
  - `type`: 模板类型，字符串类型
  - `isActive`: 是否激活/可用，布尔值
  - `userGuide`: 用户指南，对象类型
  - `isQuickTemplate`: 是否为快速模板，布尔值
  - `order`: 排序序号，数字类型，默认为-1
  - `workflow`: 工作流配置，对象类型
- **索引**: `{ templateId: 1 }` - 按模板ID建立索引

#### app_template_types (应用模板类型表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/core/app/templates/templateTypeSchema.ts`
- **集合名称**: `app_template_types`
- **字段说明**:
  - `typeName`: 类型名称，必填字段
  - `typeId`: 类型唯一标识ID，必填字段
  - `typeOrder`: 类型排序序号，数字类型，默认为0

#### app_plugin_groups (应用插件组表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/core/app/plugin/pluginGroupSchema.ts`
- **集合名称**: `app_plugin_groups`
- **字段详情**:
  - `_id`: ObjectId - 插件组唯一标识
  - `groupId`: String - 组ID (唯一)
  - `groupAvatar`: String - 组头像 (默认空)
  - `groupName`: String - 组名称
  - `groupTypes`: Array - 组类型列表
  - `groupOrder`: Number - 组排序 (默认0)
- **索引**: 支持组ID唯一索引
- **说明**: 管理插件的分组信息

#### app_system_plugins (系统插件表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/core/app/plugin/systemPluginSchema.ts`
- **集合名称**: `app_system_plugins`
- **字段详情**:
  - `_id`: ObjectId - 插件配置唯一标识
  - `pluginId`: String - 插件ID
  - `isActive`: Boolean - 是否激活
  - `originCost`: Number - 原始成本 (默认0)
  - `currentCost`: Number - 当前成本 (默认0)
  - `hasTokenFee`: Boolean - 是否有token费用 (默认false)
  - `pluginOrder`: Number - 插件排序
  - `customConfig`: Object - 自定义配置
  - `inputListVal`: Object - 输入列表值
  - `inputConfig`: Array - 输入配置 (已废弃)
- **索引**: 支持插件ID查询
- **说明**: 存储系统插件的配置信息

### 4. 数据集相关

#### datasets (数据集表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/core/dataset/schema.ts`
- **集合名称**: `datasets`
- **字段详情**:
  - `_id`: ObjectId - 数据集唯一标识
  - `parentId`: ObjectId - 父数据集ID
  - `userId`: ObjectId - 用户ID (已废弃)
  - `teamId`: ObjectId - 团队ID
  - `tmbId`: ObjectId - 团队成员ID
  - `type`: String - 数据集类型 (dataset等)
  - `avatar`: String - 数据集头像
  - `name`: String - 数据集名称
  - `updateTime`: Date - 更新时间
  - `vectorModel`: String - 向量模型 (默认text-embedding-3-small)
  - `agentModel`: String - 智能体模型 (默认gpt-4o-mini)
  - `vlmModel`: String - 视觉语言模型
  - `intro`: String - 数据集介绍
  - `websiteConfig`: Object - 网站配置 {url, selector}
  - `chunkSettings`: Object - 分块设置
  - `inheritPermission`: Boolean - 是否继承权限
  - `apiDatasetServer`: Object - API数据集服务器配置
  - `autoSync`: Boolean - 是否自动同步
  - `externalReadUrl`: String - 外部读取URL
  - `defaultPermission`: Number - 默认权限
  - `apiServer`: Object - API服务器配置
  - `feishuServer`: Object - 飞书服务器配置
  - `yuqueServer`: Object - 语雀服务器配置
- **关联**: 关联 teams, team_members 表

#### dataset_collections (数据集集合表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/core/dataset/collection/schema.ts`
- **集合名称**: `dataset_collections`
- **字段详情**:
  - `_id`: ObjectId - 集合唯一标识
  - `parentId`: ObjectId - 父集合ID
  - `teamId`: ObjectId - 团队ID
  - `tmbId`: ObjectId - 团队成员ID
  - `datasetId`: ObjectId - 数据集ID
  - `type`: String - 集合类型 (枚举值)
  - `name`: String - 集合名称
  - `tags`: [String] - 标签列表
  - `createTime`: Date - 创建时间
  - `updateTime`: Date - 更新时间
  - `fileId`: ObjectId - 本地文件ID
  - `rawLink`: String - 网页链接
  - `apiFileId`: String - API文件ID
  - `externalFileId`: String - 外部文件ID (已废弃)
  - `externalFileUrl`: String - 外部文件URL
  - `rawTextLength`: Number - 原始文本长度
  - `hashRawText`: String - 文本哈希值
  - `metadata`: Object - 元数据
  - `forbid`: Boolean - 是否禁用
  - `customPdfParse`: Boolean - 自定义PDF解析
  - `apiFileParentId`: String - API文件父ID
  - `chunkSettings`: Object - 分块设置 (继承自ChunkSettings)
- **关联**: 关联 datasets, teams, team_members 表

#### dataset_datas (数据集数据表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/core/dataset/data/schema.ts`
- **集合名称**: `dataset_datas`
- **字段详情**:
  - `_id`: ObjectId - 数据唯一标识
  - `teamId`: ObjectId - 团队ID
  - `tmbId`: ObjectId - 团队成员ID
  - `datasetId`: ObjectId - 数据集ID
  - `collectionId`: ObjectId - 集合ID
  - `q`: String - 问题内容
  - `a`: String - 答案内容
  - `imageId`: String - 图片ID
  - `imageDescMap`: Object - 图片描述映射
  - `history`: Array - 历史记录 [{q, a, updateTime}]
  - `indexes`: Array - 索引配置 [{type, dataId, text}]
  - `updateTime`: Date - 更新时间
  - `chunkIndex`: Number - 分块索引 (默认0)
  - `rebuilding`: Boolean - 是否重建中
  - `fullTextToken`: String - 全文检索token
  - `initFullText`: Boolean - 是否初始化全文检索
  - `initJieba`: Boolean - 是否初始化结巴分词
- **关联**: 关联 datasets, dataset_collections, teams, team_members 表

#### dataset_data_texts (数据集文本数据表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/core/dataset/data/dataTextSchema.ts`
- **集合名称**: `dataset_data_texts`
- **关联**: 关联 dataset_datas 表

**字段说明**:
- `teamId`: ObjectId类型，必填，关联teams表，表示所属团队ID
- `datasetId`: ObjectId类型，必填，关联datasets表，表示所属数据集ID
- `collectionId`: ObjectId类型，必填，关联dataset_collections表，表示所属集合ID
- `dataId`: ObjectId类型，必填，关联dataset_datas表，表示关联的数据ID
- `fullTextToken`: String类型，可选，存储全文搜索的文本内容

**索引**:
- `teamId_1_fullTextToken_text`: 复合索引，包含teamId和fullTextToken的文本索引
- `teamId_datasetId_collectionId`: 复合索引，用于快速查询特定团队、数据集和集合的数据
- `dataId_hashed`: 哈希索引，用于快速查找特定数据ID

#### dataset_trainings (数据集训练表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/core/dataset/training/schema.ts`
- **集合名称**: `dataset_trainings`
- **关联**: 关联数据集相关表

**字段说明**:
- `teamId`: ObjectId类型，必填，关联teams表，表示所属团队ID
- `tmbId`: ObjectId类型，必填，关联team_members表，表示团队成员ID
- `datasetId`: ObjectId类型，必填，表示所属数据集ID
- `collectionId`: ObjectId类型，必填，关联dataset_collections表，表示所属集合ID
- `billId`: String类型，可选，计费ID
- `mode`: String类型，必填，训练模式，枚举值来自TrainingModeEnum
- `expireAt`: Date类型，过期时间，默认为当前时间，7天后自动删除
- `lockTime`: Date类型，锁定时间，默认为2000/1/1
- `retryCount`: Number类型，重试次数，默认为5
- `q`: String类型，问题内容，默认为空字符串
- `a`: String类型，答案内容，默认为空字符串
- `imageId`: String类型，可选，图片ID
- `imageDescMap`: Object类型，可选，图片描述映射
- `chunkIndex`: Number类型，分块索引，默认为0
- `indexSize`: Number类型，可选，索引大小
- `weight`: Number类型，权重，默认为0
- `dataId`: ObjectId类型，可选，关联dataset_datas表的数据ID
- `indexes`: Array类型，索引数组，包含type和text字段，默认为空数组
  - `type`: String类型，索引类型，枚举值来自DatasetDataIndexTypeEnum
  - `text`: String类型，索引文本内容
- `errorMsg`: String类型，可选，错误信息

**虚拟字段**:
- `dataset`: 关联datasets表的虚拟字段
- `collection`: 关联dataset_collections表的虚拟字段
- `data`: 关联dataset_datas表的虚拟字段

#### dataset_collection_tags (数据集集合标签表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/core/dataset/tag/schema.ts`
- **集合名称**: `dataset_collection_tags`
- **关联**: 关联 dataset_collections 表

**字段说明**:
- `teamId`: ObjectId类型，必填，关联teams表，表示所属团队ID
- `datasetId`: ObjectId类型，必填，关联datasets表，表示所属数据集ID
- `tag`: String类型，必填，标签名称

**索引**:
- `teamId_datasetId_tag`: 复合索引，包含teamId、datasetId和tag，确保标签的唯一性和快速查询

### 5. 对话相关

#### chat (对话表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/core/chat/chatSchema.ts`
- **集合名称**: `chat`
- **字段详情**:
  - `_id`: ObjectId - 对话唯一标识
  - `chatId`: String - 对话ID
  - `userId`: ObjectId - 用户ID
  - `teamId`: ObjectId - 团队ID
  - `tmbId`: ObjectId - 团队成员ID
  - `appId`: ObjectId - 应用ID
  - `createTime`: Date - 创建时间
  - `updateTime`: Date - 更新时间
  - `title`: String - 对话标题 (默认'历史记录')
  - `customTitle`: String - 自定义标题
  - `top`: Boolean - 是否置顶
  - `source`: String - 对话来源
  - `sourceName`: String - 来源名称
  - `shareId`: String - 分享ID
  - `outLinkUid`: String - 外链用户ID
  - `variableList`: Array - 变量列表
  - `welcomeText`: String - 欢迎文本
  - `variables`: Object - 变量值
  - `pluginInputs`: Array - 插件输入
  - `metadata`: Object - 元数据
- **关联**: 关联 teams, team_members, apps, users 表

#### chatitems (对话项表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/core/chat/chatItemSchema.ts`
- **集合名称**: `chatitems`
- **字段详情**:
  - `_id`: ObjectId - 对话项唯一标识
  - `teamId`: ObjectId - 团队ID
  - `tmbId`: ObjectId - 团队成员ID
  - `userId`: ObjectId - 用户ID
  - `chatId`: String - 对话ID
  - `dataId`: String - 数据ID (22位随机字符)
  - `appId`: ObjectId - 应用ID
  - `time`: Date - 时间
  - `hideInUI`: Boolean - 是否在UI中隐藏
  - `obj`: String - 聊天角色 (user/assistant等)
  - `value`: Array - 聊天内容
  - `memories`: Object - 记忆数据
  - `errorMsg`: String - 错误信息
  - `userGoodFeedback`: String - 用户好评反馈
  - `userBadFeedback`: String - 用户差评反馈
  - `customFeedbacks`: [String] - 自定义反馈
  - `adminFeedback`: Object - 管理员反馈 {datasetId, collectionId, dataId, q, a}
  - `nodeResponse`: Array - 节点响应
  - `durationSeconds`: Number - 持续时间(秒)
- **关联**: 关联 teams, team_members, apps, users 表

#### chat_input_guides (对话输入指南表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/core/chat/inputGuide/schema.ts`
- **集合名称**: `chat_input_guides`
- **字段说明**:
  - `_id`: 文档唯一标识符，字符串类型，MongoDB自动生成
  - `appId`: 应用ID，关联apps表，ObjectId类型，必填字段
  - `text`: 输入指南文本内容，字符串类型，默认为空字符串
- **索引**: appId和text的复合唯一索引

### 6. 评估相关

#### eval (评估表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/core/app/evaluation/evalSchema.ts`
- **集合名称**: `eval`
- **字段说明**:
  - `teamId`: 团队ID，关联teams表，必填字段
  - `tmbId`: 团队成员ID，关联team_members表，必填字段
  - `appId`: 应用ID，关联apps表，必填字段
  - `usageId`: 使用记录ID，关联usages表，必填字段
  - `evalModel`: 评估模型名称，字符串类型，必填字段
  - `name`: 评估任务名称，字符串类型，必填字段
  - `createTime`: 创建时间，日期类型，必填字段，默认为当前时间
  - `finishTime`: 完成时间，日期类型，可选字段
  - `score`: 评估总分，数字类型，可选字段
  - `errorMessage`: 错误信息，字符串类型，可选字段
- **索引**: teamId

#### eval_items (评估项表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/core/app/evaluation/evalItemSchema.ts`
- **集合名称**: `eval_items`
- **关联**: 关联 eval 表
- **字段说明**:
  - `evalId`: 评估任务ID，关联eval表，必填字段
  - `question`: 评估问题，字符串类型，必填字段
  - `expectedResponse`: 期望回答，字符串类型，必填字段
  - `history`: 历史对话记录，字符串类型，可选字段
  - `globalVariables`: 全局变量，对象类型，可选字段
  - `response`: 实际回答，字符串类型，可选字段
  - `responseTime`: 回答时间，日期类型，可选字段
  - `status`: 评估状态，数字类型，默认为0（排队中），枚举值：0-排队中，1-评估中，2-已完成
  - `retry`: 重试次数，数字类型，默认为3
  - `finishTime`: 完成时间，日期类型，可选字段
  - `accuracy`: 准确性评分，数字类型，可选字段
  - `relevance`: 相关性评分，数字类型，可选字段
  - `semanticAccuracy`: 语义准确性评分，数字类型，可选字段
  - `score`: 平均评分，数字类型，可选字段
  - `errorMessage`: 错误信息，字符串类型，可选字段
- **索引**: evalId + status 复合索引

### 7. 钱包计费

#### usages (使用记录表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/support/wallet/usage/schema.ts`
- **集合名称**: `usages`
- **字段详情**:
  - `_id`: ObjectId - 使用记录唯一标识
  - `teamId`: ObjectId - 团队ID
  - `tmbId`: ObjectId - 团队成员ID
  - `source`: String - 使用来源 (枚举值)
  - `appName`: String - 应用名称
  - `appId`: ObjectId - 应用ID
  - `pluginId`: ObjectId - 插件ID
  - `time`: Date - 使用时间
  - `totalPoints`: Number - 总消耗点数
  - `list`: Array - 详细使用列表
- **索引**: 支持TTL自动过期 (360天)
- **关联**: 关联 teams, team_members, apps 表

#### team_sub_coupons (团队订阅优惠券表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/support/wallet/coupon/schema.ts`
- **集合名称**: `team_sub_coupons`
- **字段详情**:
  - `_id`: ObjectId - 优惠券唯一标识
  - `key`: String - 优惠券密钥，必填，唯一索引
  - `type`: String - 优惠券类型，枚举值 (bank: 银行券, activity: 活动券)
  - `price`: Number - 优惠券价值金额
  - `description`: String - 优惠券描述信息
  - `subscriptions`: Array[Object] - 订阅配置数组，必填
    - `type`: String - 订阅类型 (standard: 标准订阅, extraDatasetSize: 额外数据集大小, extraPoints: 额外积分)
    - `durationDay`: Number - 持续天数
    - `level`: String - 标准订阅级别 (仅当type为standard时)
    - `extraDatasetSize`: Number - 额外数据集大小 (仅当type为extraDatasetSize时)
    - `totalPoints`: Number - 总积分数 (用于extraPoints或standard订阅)
  - `redeemedAt`: Date - 兑换时间，默认未定义
  - `redeemedTeamId`: ObjectId - 兑换团队ID，关联teams表
  - `expiredAt`: Date - 过期时间，默认创建后7天
- **索引**: key字段唯一索引
- **关联**: 关联 teams 表

#### pays (支付账单表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/projects/app/src/service/support/wallet/bill/schema.ts`
- **集合名称**: `pays`
- **字段详情**:
  - `_id`: ObjectId - 账单唯一标识
  - `teamId`: ObjectId - 团队ID
  - `tmbId`: ObjectId - 团队成员ID
  - `createTime`: Date - 创建时间
  - `orderId`: String - 订单ID (唯一)
  - `status`: String - 支付状态 (NOTPAY, SUCCESS, REFUND等)
  - `type`: String - 账单类型 (balance, standSubPlan, extraDatasetSub, extraPoints)
  - `price`: Number - 总价格 (以分为单位)
  - `hasInvoice`: Boolean - 是否已开发票
  - `metadata`: Object - 元数据 (包含支付方式、套餐信息等)
  - `refundData`: Object - 退款数据
- **索引**: 支持状态、时间、团队等多维度查询
- **关联**: 关联 teams, team_members 表

#### bill_invoices (账单发票表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/projects/app/src/service/support/wallet/bill/invoiceSchema.ts`
- **集合名称**: `bill_invoices`
- **字段详情**:
  - `_id`: ObjectId - 发票唯一标识
  - `teamId`: ObjectId - 团队ID (继承自teamInvoiceTitleScheme)
  - `invoiceTitle`: String - 发票抬头 (继承自teamInvoiceTitleScheme)
  - `taxId`: String - 税号 (继承自teamInvoiceTitleScheme)
  - `amount`: Number - 发票金额
  - `status`: Number - 发票状态 (枚举值)
  - `billIdList`: [String] - 关联的账单ID列表
  - `createTime`: Date - 创建时间
  - `finishTime`: Date - 完成时间
  - `file`: Buffer - 发票文件 (可选)
- **索引**: 支持团队ID查询
- **关联**: 关联 pays, teams 表

### 8. 权限相关

#### resource_permissions (资源权限表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/support/permission/schema.ts`
- **集合名称**: `resource_permissions`
- **字段详情**:
  - `_id`: ObjectId - 权限记录唯一标识
  - `teamId`: ObjectId - 团队ID
  - `tmbId`: ObjectId - 团队成员ID (可选)
  - `groupId`: ObjectId - 成员组ID (可选)
  - `orgId`: ObjectId - 组织ID (可选)
  - `resourceType`: String - 资源类型 (app/dataset等)
  - `resourceId`: ObjectId - 资源ID
  - `permission`: Number - 权限值 (位运算)
- **虚拟字段**: tmb, group, org (关联查询)
- **索引**: 支持资源类型、资源ID、团队ID等多维度查询
- **关联**: 关联 teams, team_members, team_member_groups, team_orgs 表
- **说明**: 支持用户、组、组织三级权限控制

### 9. 其他业务表

#### openapis (开放API表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/support/openapi/schema.ts`
- **集合名称**: `openapis`
- **字段详情**:
  - `_id`: ObjectId - API记录唯一标识
  - `teamId`: ObjectId - 团队ID
  - `tmbId`: ObjectId - 团队成员ID
  - `apiKey`: String - API密钥 (加密显示)
  - `createTime`: Date - 创建时间
  - `lastUsedTime`: Date - 最后使用时间
  - `appId`: ObjectId - 关联应用ID
  - `name`: String - API名称 (默认'Api Key')
  - `usagePoints`: Number - 已使用点数 (默认0)
  - `limit`: Object - 使用限制配置
    - `expiredTime`: Date - 过期时间
    - `maxUsagePoints`: Number - 最大使用点数 (默认-1无限制)
- **索引**: 支持团队ID和API密钥查询
- **关联**: 关联 teams, team_members 表

#### external_links (外部链接表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/support/outLink/schema.ts`
- **集合名称**: `outlinks`
- **字段说明**:
  - `shareId`: String, 必填 - 分享链接的唯一标识符
  - `teamId`: ObjectId, 必填 - 关联的团队ID，引用teams集合
  - `tmbId`: ObjectId, 必填 - 团队成员ID，引用team_members集合
  - `appId`: ObjectId, 必填 - 关联的应用ID，引用apps集合
  - `type`: String, 必填 - 外部链接类型
  - `name`: String, 必填 - 外部链接名称
  - `usagePoints`: Number, 默认0 - 使用积分数
  - `lastTime`: Date - 最后使用时间
  - `responseDetail`: Boolean, 默认false - 是否显示响应详情
  - `showNodeStatus`: Boolean, 默认true - 是否显示节点状态
  - `showRawSource`: Boolean - 是否显示原始数据源
  - `limit`: Object - 限制配置
    - `maxUsagePoints`: Number, 默认-1 - 最大使用积分数（-1表示无限制）
    - `expiredTime`: Date - 过期时间
    - `QPM`: Number, 默认1000 - 每分钟查询次数限制
    - `hookUrl`: String - 回调URL
  - `app`: Object - 第三方应用配置（如飞书、企微等）
  - `immediateResponse`: String - 即时响应内容
  - `defaultResponse`: String - 默认响应内容

#### promotions (活动推广表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/support/activity/promotion/schema.ts`
- **集合名称**: `promotionRecord`
- **字段说明**:
  - `userId`: ObjectId, 必填 - 用户ID，引用user集合
  - `objUId`: ObjectId, 可选 - 目标用户ID，引用user集合
  - `createTime`: Date, 默认当前时间 - 创建时间
  - `type`: String, 必填 - 推广类型，枚举值：'pay'(付费)、'register'(注册)
  - `amount`: Number, 必填 - 金额（1 * PRICE_SCALE）

#### mcp_keys (MCP密钥表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/support/mcp/schema.ts`
- **集合名称**: `mcp_keys`
- **字段说明**:
  - `name`: String, 必填 - MCP密钥名称
  - `key`: String, 必填, 唯一 - MCP密钥值，默认生成24位随机字符串
  - `teamId`: ObjectId, 必填 - 关联的团队ID，引用teams集合
  - `tmbId`: ObjectId, 必填 - 团队成员ID，引用team_members集合
  - `apps`: Array, 默认空数组 - 关联的应用列表
    - `appId`: ObjectId, 必填 - 应用ID，引用apps集合
    - `appName`: String - 应用名称
    - `toolName`: String, 必填 - 工具名称
    - `description`: String, 必填 - 工具描述

#### tmp_datas (临时数据表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/support/tmpData/schema.ts`
- **集合名称**: `tmp_datas`
- **字段说明**:
  - `dataId`: String, 必填, 唯一 - 临时数据的唯一标识符
  - `data`: Object - 存储的临时数据对象
  - `expireAt`: Date, 必填 - 数据过期时间，过期后自动删除（TTL索引，5秒后删除）

### 10. 系统表

#### systemConfigs (系统配置表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/common/system/config/schema.ts`
- **集合名称**: `systemConfigs`
- **字段详情**:
  - `_id`: ObjectId - 配置唯一标识
  - `type`: String - 配置类型 (枚举值)
  - `value`: Object - 配置值
  - `createTime`: Date - 创建时间
- **索引**: 支持配置类型查询
- **说明**: 存储系统级配置信息

#### system_logs (系统日志表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/common/system/log/schema.ts`
- **集合名称**: `system_logs`
- **字段说明**:
  - `text` (String, 必填): 日志内容文本
  - `level` (String, 必填): 日志级别，枚举值包括：
    - `0`: debug (调试级别)
    - `1`: info (信息级别)
    - `2`: warn (警告级别)
    - `3`: error (错误级别)
  - `time` (Date, 默认当前时间): 日志记录时间
  - `metadata` (Object, 可选): 日志元数据，存储额外信息
- **索引**:
  - `time` 字段升序索引，15天后自动过期
  - `level` 字段升序索引

#### systemtimerlocks (系统定时锁表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/common/system/timerLock/schema.ts`
- **集合名称**: `systemtimerlocks`
- **字段说明**:
  - `timerId` (String, 必填, 唯一): 定时器唯一标识符
  - `expiredTime` (Date, 必填): 锁的过期时间
- **索引**:
  - `expiredTime` 字段升序索引，过期后5秒自动删除

#### buffer_tts (TTS缓存表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/common/buffer/tts/schema.ts`
- **集合名称**: `buffer_tts`
- **字段说明**:
  - `bufferId` (String, 必填): TTS缓存的唯一标识符
  - `text` (String, 必填): 需要转换为语音的文本内容
  - `buffer` (Buffer, 必填): 存储TTS生成的音频数据
  - `createTime` (Date, 默认当前时间): 缓存创建时间
- **索引**:
  - `bufferId` 字段升序索引
  - `createTime` 字段升序索引，24小时后自动过期删除

#### files (文件表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/common/file/gridfs/schema.ts`
- **集合名称**: `dataset.files` 和 `chat.files` (GridFS)
- **字段详情**:
  - `_id`: ObjectId - 文件唯一标识
  - `length`: Number - 文件大小
  - `chunkSize`: Number - 分块大小
  - `uploadDate`: Date - 上传时间
  - `filename`: String - 文件名
  - `contentType`: String - 文件类型
  - `metadata`: Object - 文件元数据
    - `teamId`: String - 团队ID (dataset.files)
    - `datasetId`: String - 数据集ID (dataset.files)
    - `collectionId`: String - 集合ID (dataset.files)
    - `expiredTime`: Date - 过期时间 (dataset.files)
    - `chatId`: String - 对话ID (chat.files)
- **索引**: 支持上传时间和chatId索引
- **说明**: 使用GridFS存储大文件


#### chat_settings (聊天设置表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/core/chat/setting/schema.ts`
- **集合名称**: `chat_settings`
- **字段说明**:
  - `teamId` (ObjectId, 必填): 团队ID，引用teams集合
  - `appId` (ObjectId, 必填): 应用ID，引用apps集合
  - `slogan` (String, 可选): 标语文本
  - `dialogTips` (String, 可选): 对话提示信息
  - `selectedTools` (Array, 默认空数组): 选中的工具列表
  - `homeTabTitle` (String, 可选): 首页标签标题
  - `wideLogoUrl` (String, 可选): 宽版Logo URL
  - `squareLogoUrl` (String, 可选): 方形Logo URL
- **索引**:
  - `teamId` 字段升序索引
---

## PostgreSQL 表结构

### modeldata (向量数据表)
- **文件地址**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/common/vectorDB/pg/index.ts`
- **常量定义**: `/Users/huangjiarui/Desktop/fast/fastgpt-pro/FastGPT/packages/service/common/vectorDB/constants.ts`
- **表名**: `modeldata`
- **数据库名**: `fastgpt`

#### 表结构
```sql
CREATE TABLE IF NOT EXISTS modeldata (
    id BIGSERIAL PRIMARY KEY,                    -- 主键ID，自增长整型，唯一标识每条向量记录
    vector VECTOR(1536) NOT NULL,                -- 向量数据，1536维浮点数组，存储文本的嵌入向量表示
    team_id VARCHAR(50) NOT NULL,                -- 团队ID，用于多租户数据隔离，关联到MongoDB中的team表
    dataset_id VARCHAR(50) NOT NULL,             -- 数据集ID，标识向量所属的知识库，关联到MongoDB中的dataset表
    collection_id VARCHAR(50) NOT NULL,          -- 集合ID，标识向量所属的数据集合，关联到MongoDB中的dataset.collections表
    createtime TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 创建时间，记录向量数据的插入时间，用于数据统计和清理
);
```

#### 字段详细说明

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| **id** | BIGSERIAL | PRIMARY KEY | 主键ID，PostgreSQL自增长整型，范围1到9223372036854775807，用于唯一标识每条向量记录 |
| **vector** | VECTOR(1536) | NOT NULL | 向量数据字段，存储1536维的浮点数向量，通常由OpenAI的text-embedding-ada-002模型生成，用于语义相似度计算 |
| **team_id** | VARCHAR(50) | NOT NULL | 团队标识符，实现多租户数据隔离，与MongoDB中teams集合的_id字段关联，确保不同团队的向量数据相互隔离 |
| **dataset_id** | VARCHAR(50) | NOT NULL | 数据集标识符，标识向量所属的知识库，与MongoDB中datasets集合的_id字段关联，用于组织和管理向量数据 |
| **collection_id** | VARCHAR(50) | NOT NULL | 集合标识符，标识向量所属的数据集合，与MongoDB中dataset.collections的_id字段关联，实现更细粒度的数据组织 |
| **createtime** | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间戳，自动记录向量数据的插入时间，用于数据统计、性能分析和定期清理策略 |

#### 数据关联关系

- **与MongoDB的关联**: 向量表通过team_id、dataset_id、collection_id与MongoDB中的业务数据建立关联
- **数据流向**: 用户上传文档 → 文本分块 → 向量化 → 存储到PostgreSQL → 检索时通过向量相似度召回
- **多向量映射**: 一个MongoDB数据块可能对应多个向量记录，提高检索精度和召回率

#### 索引
```sql
-- HNSW向量索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS vector_index 
ON modeldata USING hnsw (vector vector_ip_ops) 
WITH (m = 32, ef_construction = 128);

-- 复合索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS team_dataset_collection_index 
ON modeldata USING btree(team_id, dataset_id, collection_id);

-- 时间索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS create_time_index 
ON modeldata USING btree(createtime);
```



