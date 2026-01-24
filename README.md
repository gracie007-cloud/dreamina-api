# Dreamina API - Cloudflare Workers 版本

> **异步任务模式** - 避免 Workers 30秒超时限制

即梦海外版 | Dreamina (CapCut AI) 图像生成 API | 基于 Cloudflare Workers 部署

在线示例：https://j.aisk.de5.net

## 功能特性

- ✅ **异步任务模式** - 提交任务后轮询状态，避免超时
- ✅ **可视化 Web 界面** - 直观的图形界面，无需编写代码
- ✅ **多 Session ID 管理** - 支持添加多个 Session ID，随机选择使用
- ✅ 文生图 (Text-to-Image)
- ✅ 图生图 (Image-to-Image)
- ✅ 支持多种模型和分辨率
- ✅ OpenAI 兼容的 API 格式
- ✅ 无服务器部署，全球边缘节点

## 异步任务模式说明

由于图片生成通常需要 1-3 分钟，而 Cloudflare Workers 免费版有 30 秒超时限制，本项目采用**异步任务模式**：

1. **提交任务** - 调用生成接口，立即返回 `task_id`
2. **轮询状态** - 通过 `task_id` 查询任务状态和进度
3. **获取结果** - 任务完成后获取图片 URL

### 使用流程

```bash
# 1. 提交生成任务
curl -X POST https://your-worker.workers.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer hk-YOUR_SESSION_ID" \
  -d '{"prompt": "一只可爱的小猫", "model": "dreamina-4.5"}'

# 返回: {"task_id": "xxx", "status": "pending"}

# 2. 轮询查询状态（每 2-3 秒查询一次）
curl -X GET https://your-worker.workers.dev/v1/images/tasks/xxx \
  -H "Authorization: Bearer hk-YOUR_SESSION_ID"

# 返回: {"status": "processing", "progress": 50}
# 或: {"status": "completed", "images": ["url1", "url2", ...]}
```

### 任务状态说明

| 状态 | 说明 |
|------|------|
| `pending` | 任务已提交，等待处理 |
| `processing` | 正在生成中，可能已有部分图片 |
| `completed` | 生成完成，可获取所有图片 |
| `failed` | 生成失败，查看 error 字段 |

## 支持的模型

| 模型名称 | API Key |
|---------|---------|
| Image 4.5 | `dreamina-4.5` / `jimeng-4.5` (默认) |
| Image 4.1 | `dreamina-4.1` / `jimeng-4.1` |
| Image 4.0 | `dreamina-4.0` / `jimeng-4.0` |

## 支持的比例

`1:1`, `4:3`, `3:4`, `16:9`, `9:16`, `3:2`, `2:3`, `21:9`

## 部署

### 前置要求

- Node.js 18+
- Cloudflare 账号
- Wrangler CLI

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

### 部署到 Cloudflare

```bash
npm run deploy
```

## API 文档

### 提交文生图任务

```bash
curl -X POST https://your-worker.workers.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer hk-YOUR_SESSION_ID" \
  -d '{
    "prompt": "画一个苹果",
    "model": "dreamina-4.5",
    "ratio": "16:9",
    "resolution": "2k"
  }'
```

**响应：**
```json
{
  "task_id": "7459123456789",
  "submit_id": "f4d70bb5-5184-4025-89c0-c18db7977135",
  "status": "pending",
  "message": "任务已提交，请通过 GET /v1/images/tasks/{task_id} 查询状态",
  "created": 1706000000
}
```

### 查询任务状态

```bash
curl -X GET https://your-worker.workers.dev/v1/images/tasks/7459123456789 \
  -H "Authorization: Bearer hk-YOUR_SESSION_ID"
```

**响应（进行中）：**
```json
{
  "taskId": "7459123456789",
  "status": "processing",
  "progress": 50,
  "createdAt": 1706000000
}
```

**响应（完成）：**
```json
{
  "taskId": "7459123456789",
  "status": "completed",
  "progress": 100,
  "images": [
    "https://p16-dreamina-useast8.ibyteimg.com/...",
    "https://p16-dreamina-useast8.ibyteimg.com/...",
    "https://p16-dreamina-useast8.ibyteimg.com/...",
    "https://p16-dreamina-useast8.ibyteimg.com/..."
  ],
  "createdAt": 1706000000
}
```

### 参数说明

| 参数 | 必填 | 说明 |
|------|------|------|
| `prompt` | ✅ | 图片描述 |
| `model` | ❌ | 模型名称，默认 `dreamina-4.5` |
| `ratio` | ❌ | 图片比例，默认 `1:1` |
| `resolution` | ❌ | 分辨率 `1k`/`2k`/`4k`，默认 `2k` |
| `negative_prompt` | ❌ | 负向提示词 |
| `sample_strength` | ❌ | 精细度 (0-1)，默认 0.5 |

### 图生图

```bash
curl -X POST https://your-worker.workers.dev/v1/images/compositions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer hk-YOUR_SESSION_ID" \
  -d '{
    "prompt": "将这些图片融合成一幅画",
    "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
    "model": "dreamina-4.5",
    "ratio": "16:9"
  }'
```

### 获取模型列表

```bash
curl https://your-worker.workers.dev/v1/models
```

## 获取 Session ID

### 步骤

1. 访问 [Dreamina](https://dreamina.capcut.com/)
2. 登录账号
3. 打开浏览器开发者工具 (F12)
4. 切换到 Application/Storage 标签
5. 在 Cookies 中找到 `sessionid` 或 `sessionid_ss`
6. **根据你使用的站点添加前缀**（见下表）
7. 复制其值作为 `YOUR_SESSION_ID`

### ⚠️ 重要：区域前缀说明

**海外站必须添加区域前缀，否则会报错 1000 或 1006！**

| 区域 | 网站 | 前缀 | Session ID 示例 |
|------|------|------|------|
| 美国站 | dreamina.capcut.com | `us-` | `us-abc123xyz789...` |
| 香港站 | dreamina.capcut.com (HK) | `hk-` | `hk-abc123xyz789...` |
| 日本站 | dreamina.capcut.com (JP) | `jp-` | `jp-abc123xyz789...` |
| 新加坡站 | dreamina.capcut.com (SG) | `sg-` | `sg-abc123xyz789...` |
| 中国站 | jimeng.jianying.com | 无前缀 | `abc123xyz789...` |

例如，如果你从香港站获取的 sessionid 是 `abc123xyz789`，那么你应该使用 `hk-abc123xyz789`

## 可视化界面

部署后访问根路径即可看到可视化界面：

- 首页 (`/`) - 可视化图像生成器（支持异步轮询）
- API 文档 (`/docs`) - API 接口说明

界面功能：
- 🔑 Session ID 管理：添加/删除多个 Session ID，自动保存到浏览器
- ⚙️ 生成设置：模型选择、图片比例、分辨率、精细度调整
- 🖼️ 结果展示：实时进度显示、查看大图、一键下载

部分界面展示：
<img width="1547" height="729" alt="image" src="https://github.com/user-attachments/assets/8e2dfcd5-05f4-4a30-a564-2d1045aff102" />

<img width="1547" height="733" alt="image" src="https://github.com/user-attachments/assets/891a808b-31a0-4821-b6aa-0395134515bb" />

<img width="1490" height="781" alt="image" src="https://github.com/user-attachments/assets/fdf66f21-ff91-4146-a783-5c905b2a7949" />

## 注意事项

1. **Token 有效期**：Session ID 有一定有效期，过期后需要重新获取
2. **请求频率**：请合理控制请求频率，避免触发限制
3. **内容审核**：生成内容受 Dreamina 内容审核策略限制
4. **积分消耗**：生成图片会消耗 Dreamina 账户积分
5. **超时处理**：使用异步模式避免 Workers 超时，建议每 2-3 秒轮询一次

## 与原项目的区别

本项目基于 [dongshuyan/dreamina2api](https://github.com/dongshuyan/dreamina2api) 和 [iptag/jimeng-api](https://github.com/iptag/jimeng-api) 重构，主要改动：

- 从 Node.js + Koa 改为 Cloudflare Workers
- **采用异步任务模式避免超时**
- 使用 Web Crypto API 替代 Node.js crypto 模块
- 使用 fetch API 替代 axios
- 移除文件系统依赖
- 简化部署流程

## License

MIT

## 致谢

- [dongshuyan/dreamina2api](https://github.com/dongshuyan/dreamina2api) - 原始项目
- [iptag/jimeng-api](https://github.com/iptag/jimeng-api) - 参考实现
- [Cloudflare Workers](https://workers.cloudflare.com/) - 无服务器平台
