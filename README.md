# 华师校园 · SCNU Campus

华南师范大学校园服务移动 Web 应用，覆盖石牌、大学城、南海三校区。

## 功能概览

- **首页** — 课程卡片、快捷入口（课程表 / 入校码）、自习室查询、GPA 曲线、考试倒计时
- **自习室** — 按校区浏览教学楼，查看每间教室的空闲状态、座位数、空调/电源信息，支持预约
- **AI 助手（小天老师）** — 接入硅基流动大模型，回答校园学习与生活问题；无 API Key 时自动降级为本地 Mock
- **校园论坛** — 学习/生活/二手/失物招领分类，发帖、点赞、评论
- **个人中心** — 个人信息编辑、深色模式、通知开关、版本检查、登出
- **深色模式** — 全局夜间主题，设置中一键切换，偏好自动持久化到 localStorage

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | HTML5 + CSS3 + Vanilla JS（单文件 SPA） |
| 后端 | Node.js + Express |
| AI | 硅基流动 API（Qwen3-8B） |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量（可选）

在项目根目录创建 `.env` 文件：

```env
SILICONFLOW_API_KEY=你的硅基流动API密钥
AI_MODEL=Qwen/Qwen3-8B
PORT=3000
```

> 不配置 `SILICONFLOW_API_KEY` 时，AI 助手会使用本地 Mock 回复，不影响其他功能。

### 3. 启动服务

```bash
npm start
```

浏览器访问 `http://localhost:3000` 即可。

## 项目结构

```
dream/
├── index.html          # 前端单页应用（HTML + CSS + JS）
├── server.js           # Express 后端 API 服务
├── package.json
├── .env                # 环境变量（需自行创建）
└── node_modules/
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/buildings?campus=` | 获取校区建筑列表 |
| GET | `/api/buildings/:name/rooms` | 获取教室空闲信息 |
| GET | `/api/courses` | 获取课程表 |
| GET | `/api/courses/current` | 获取当前进行/即将开始的课程 |
| GET | `/api/exams` | 获取考试列表及倒计时 |
| GET | `/api/gpa` | 获取 GPA 数据 |
| GET | `/api/user/profile` | 获取用户信息 |
| PUT | `/api/user/profile` | 更新用户信息 |
| POST | `/api/login` | 登录 |
| POST | `/api/chat` | 发送消息给 AI 助手 |
| GET | `/api/forum/posts` | 获取论坛帖子 |
| POST | `/api/forum/posts` | 发布帖子 |
| POST | `/api/forum/posts/:id/like` | 点赞 |
| POST | `/api/forum/posts/:id/comment` | 评论 |

## 许可

MIT
