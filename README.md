# Traveler - 全球文化遗产旅游平台后端

Traveler - 全球文化遗产旅游平台的 Node.js 后端服务，负责用户认证、用户资料维护、文化遗产数据查询、AI 行程生成和行程记录保存。

## 技术栈

- Node.js + TypeScript
- Express
- MySQL / mysql2
- JWT
- Multer
- Winston
- 讯飞星火大模型 WebSocket API

## 主要功能

- 用户注册、登录、邮箱登录、Token 刷新和当前用户信息查询。
- JWT 鉴权中间件保护用户设置、头像上传和行程相关接口。
- 文化遗产列表和详情查询；数据库不可用时可回退到本地 `src/data/heritages.json`。
- 基于用户选择的目的地、日期、出行人数和兴趣主题调用星火大模型生成行程。
- 将生成的行程保存到 MySQL，并支持查询当前用户的行程记录。
- 头像上传到 `uploads/avatars`，并通过 `/uploads` 静态路径访问。
- 使用 Winston 输出控制台日志和文件日志。

## 本地运行

```bash
npm install
npm run dev
```

服务默认监听 `3000` 端口。前端项目的 Vite 开发代理会将 `/api` 请求转发到 `http://localhost:3000`。

## 构建和启动

```bash
npm run build
npm start
```

## Docker 部署

本仓库包含基于 GitHub Actions 的 Docker 打包和自动部署流程：

- `Dockerfile`: 多阶段构建生产镜像。
- `deploy/docker-compose.prod.yml`: 服务器上的生产编排文件。
- `.github/workflows/docker-deploy.yml`: 推送到 `main` 时构建镜像、推送到 GHCR，并在配置服务器信息后自动部署。

本地构建镜像：

```bash
docker build -t traveler-backend .
```

本地使用 compose 启动：

```bash
IMAGE_NAME=traveler-backend ENV_FILE=../.env LOGS_DIR=../logs UPLOADS_DIR=../uploads APP_PORT=3000 docker compose -f deploy/docker-compose.prod.yml up -d
```

### GitHub Environment Secrets

workflow 的部署任务绑定到 `production` Environment。请在 GitHub 仓库的 `Settings -> Environments -> production -> Environment secrets` 中配置：

必填：

- `DEPLOY_HOST`: 服务器地址。
- `DEPLOY_USER`: SSH 用户名。
- `DEPLOY_SSH_KEY`: 可登录服务器的 SSH 私钥。

可选：

- `DEPLOY_PORT`: SSH 端口，默认 `22`。
- `DEPLOY_PATH`: 服务器部署目录，默认 `/opt/traveler-backend`。
- `APP_PORT`: 宿主机暴露端口，默认 `3000`。
- `DEPLOY_REGISTRY_USERNAME`: 服务器拉取 GHCR 私有镜像时使用的用户名。
- `DEPLOY_REGISTRY_TOKEN`: 服务器拉取 GHCR 私有镜像时使用的 token。

服务器部署目录下需要提前准备 `.env`，内容参考下一节环境变量。首次部署时 workflow 会自动上传 `docker-compose.yml` 并创建 `logs`、`uploads/avatars` 目录。

## 环境变量

在项目根目录创建 `.env`：

```env
PORT=3000

DB_HOST=host.docker.internal
DB_USER=root
DB_PASSWORD=your_password
DB_NAME_HERITAGE=global_travel

JWT_SECRET=replace_with_a_strong_secret

SPARK_API_KEY=your_spark_api_key
SPARK_API_SECRET=your_spark_api_secret
SPARK_APP_ID=your_spark_app_id
SPARK_VERSION=v1.1
SPARK_DOMAIN=general
```

说明：

- `DB_*` 用于连接 MySQL。Docker 部署时，如果 MySQL 暴露在宿主机端口上，推荐使用 `DB_HOST=host.docker.internal`；compose 已通过 `host-gateway` 为 Linux 服务器配置该主机名。
- `JWT_SECRET` 用于签发和校验登录 Token。
- `SPARK_*` 用于调用讯飞星火大模型生成行程。
- 如果数据库连接失败，文化遗产查询会使用本地 JSON 数据；用户和行程相关能力仍依赖数据库。

## API 概览

基础路径：

- 文化遗产接口挂载在 `/api`
- 行程接口挂载在 `/api/trips`
- 认证接口挂载在 `/api/auth`
- 用户接口挂载在 `/api/user`
- 上传文件访问路径为 `/uploads`

常用接口：

```text
GET  /api/heritages
GET  /api/heritages/:id

POST /api/auth/register
POST /api/auth/login
POST /api/auth/login-email
POST /api/auth/send-captcha
GET  /api/auth/me
POST /api/auth/refresh-token

POST /api/trips/generate
GET  /api/trips/my-trips

PUT  /api/user/settings
PUT  /api/user/change-password
PUT  /api/user/avatar
```

`/api/trips/*` 和 `/api/user/*` 需要在请求头中携带：

```text
Authorization: Bearer <token>
```

## 目录结构

```text
src/
  app.ts          Express 应用入口
  config/         数据库连接和日志配置
  controllers/    控制器
  data/           本地文化遗产回退数据
  middleware/     JWT 鉴权中间件
  models/         用户、行程、文化遗产数据访问
  routes/         API 路由
  services/       星火大模型客户端
  types/          Express 和 JWT 类型扩展
uploads/          用户上传文件目录
logs/             运行日志目录
```

## 常用脚本

- `npm run dev`: 使用 `ts-node-dev` 启动开发服务。
- `npm run build`: 编译 TypeScript 到 `dist`。
- `npm start`: 运行编译后的 `dist/app.js`。
