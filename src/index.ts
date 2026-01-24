/**
 * Dreamina API - Cloudflare Workers 版本
 * 
 * 即梦海外版 | Dreamina (CapCut AI) 图像生成 API
 * 支持异步任务模式，避免 Workers 超时限制
 */

import { submitImageTask, submitCompositionTask, getTaskStatus, getHistoryBySubmitIds } from './images';
import { tokenSplit, sample, unixTimestamp } from './utils';
import { IMAGE_MODEL_MAP, DEFAULT_IMAGE_MODEL } from './consts';
import { uiHtml } from './ui';

export interface Env {
  DEFAULT_TOKEN?: string;
}

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// JSON 响应
function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// 错误响应
function errorResponse(message: string, status = 400): Response {
  return jsonResponse({
    error: {
      message,
      type: 'api_error',
      code: status,
    },
  }, status);
}

// 处理 OPTIONS 请求
function handleOptions(): Response {
  return new Response(null, {
    headers: corsHeaders,
  });
}

// API 文档 HTML
const docsHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dreamina API - 文档</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 900px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 { color: #333; margin-bottom: 10px; font-size: 2em; }
    .subtitle { color: #666; margin-bottom: 30px; }
    h2 { color: #444; margin: 25px 0 15px; font-size: 1.3em; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    .endpoint { 
      background: #f8f9fa; 
      border-radius: 8px; 
      padding: 15px; 
      margin: 10px 0;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 14px;
    }
    .method { 
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: bold;
      margin-right: 10px;
    }
    .post { background: #49cc90; color: white; }
    .get { background: #61affe; color: white; }
    code {
      background: #e9ecef;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', monospace;
    }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-left: 5px;
    }
    .required { background: #fee2e2; color: #dc2626; }
    .optional { background: #e0f2fe; color: #0284c7; }
    .new { background: #dcfce7; color: #16a34a; }
    pre {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 13px;
    }
    .alert {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 15px;
      margin: 15px 0;
    }
    .alert-title { font-weight: bold; color: #b45309; margin-bottom: 5px; }
    .footer { margin-top: 30px; text-align: center; color: #999; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎨 Dreamina API</h1>
    <p class="subtitle">Cloudflare Workers 版本 - 异步任务模式</p>
    
    <div class="alert">
      <div class="alert-title">⚡ 异步任务模式</div>
      <p>由于图片生成需要 1-3 分钟，为避免 Workers 超时，API 采用异步模式：</p>
      <ol style="margin-left: 20px; margin-top: 10px;">
        <li>调用生成接口，立即返回 <code>task_id</code></li>
        <li>轮询查询接口获取任务状态</li>
        <li>任务完成后获取图片 URL</li>
      </ol>
    </div>

    <h2>📡 API 端点</h2>
    
    <div class="endpoint">
      <span class="method post">POST</span>
      <span>/v1/images/generations</span>
      <span style="color: #666; margin-left: 10px;">- 提交文生图任务</span>
    </div>
    
    <div class="endpoint">
      <span class="method get">GET</span>
      <span>/v1/images/tasks/{task_id}</span>
      <span class="badge new">新增</span>
      <span style="color: #666; margin-left: 10px;">- 查询任务状态</span>
    </div>
    
    <div class="endpoint">
      <span class="method post">POST</span>
      <span>/v1/images/compositions</span>
      <span style="color: #666; margin-left: 10px;">- 提交图生图任务</span>
    </div>
    
    <div class="endpoint">
      <span class="method get">GET</span>
      <span>/v1/models</span>
      <span style="color: #666; margin-left: 10px;">- 获取模型列表</span>
    </div>

    <h2>🔄 使用流程</h2>
    <pre>
# 1. 提交生成任务
curl -X POST https://your-worker.workers.dev/v1/images/generations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer hk-YOUR_SESSION_ID" \\
  -d '{"prompt": "一只可爱的小猫", "model": "dreamina-4.5"}'

# 返回: {"task_id": "xxx", "status": "pending"}

# 2. 轮询查询状态（每 2-3 秒查询一次）
curl -X GET https://your-worker.workers.dev/v1/images/tasks/xxx \\
  -H "Authorization: Bearer hk-YOUR_SESSION_ID"

# 返回: {"status": "processing", "progress": 50}
# 或: {"status": "completed", "images": ["url1", "url2", ...]}</pre>

    <h2>🎯 支持的模型</h2>
    <table>
      <tr><th>模型名称</th><th>API Key</th></tr>
      <tr><td>Image 4.5</td><td><code>dreamina-4.5</code> / <code>jimeng-4.5</code></td></tr>
      <tr><td>Image 4.1</td><td><code>dreamina-4.1</code> / <code>jimeng-4.1</code></td></tr>
      <tr><td>Image 4.0</td><td><code>dreamina-4.0</code> / <code>jimeng-4.0</code></td></tr>
    </table>

    <h2>⚠️ Session ID 区域前缀</h2>
    <table>
      <tr><th>区域</th><th>前缀</th><th>示例</th></tr>
      <tr><td>美国站</td><td>us-</td><td>us-abc123xyz789</td></tr>
      <tr><td>香港站</td><td>hk-</td><td>hk-abc123xyz789</td></tr>
      <tr><td>日本站</td><td>jp-</td><td>jp-abc123xyz789</td></tr>
      <tr><td>新加坡站</td><td>sg-</td><td>sg-abc123xyz789</td></tr>
    </table>

    <h2>📋 任务状态说明</h2>
    <table>
      <tr><th>状态</th><th>说明</th></tr>
      <tr><td><code>pending</code></td><td>任务已提交，等待处理</td></tr>
      <tr><td><code>processing</code></td><td>正在生成中，可能已有部分图片</td></tr>
      <tr><td><code>completed</code></td><td>生成完成，可获取所有图片</td></tr>
      <tr><td><code>failed</code></td><td>生成失败，查看 error 字段</td></tr>
    </table>

    <div class="footer">
      <p>Powered by Cloudflare Workers</p>
    </div>
  </div>
</body>
</html>`;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // 处理 CORS
    if (method === 'OPTIONS') {
      return handleOptions();
    }

    try {
      // 首页 - 可视化界面
      if (path === '/' && method === 'GET') {
        return new Response(uiHtml, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...corsHeaders,
          },
        });
      }

      // API 文档页面
      if (path === '/docs' && method === 'GET') {
        return new Response(docsHtml, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...corsHeaders,
          },
        });
      }

      // 健康检查
      if (path === '/ping' || path === '/health') {
        return jsonResponse({ status: 'ok', timestamp: Date.now() });
      }

      // 获取模型列表
      if (path === '/v1/models' && method === 'GET') {
        const models = Object.keys(IMAGE_MODEL_MAP).map(id => ({
          id,
          object: 'model',
          created: 1700000000,
          owned_by: 'dreamina',
        }));
        return jsonResponse({
          object: 'list',
          data: models,
        });
      }

      // 查询任务状态
      const taskMatch = path.match(/^\/v1\/images\/tasks\/([^\/]+)$/);
      if (taskMatch && method === 'GET') {
        const taskId = taskMatch[1];
        
        // 获取 token
        const authorization = request.headers.get('Authorization');
        const tokens = tokenSplit(authorization);
        if (tokens.length === 0 && !env.DEFAULT_TOKEN) {
          return errorResponse('Authorization header 是必需的', 401);
        }
        const token = sample(tokens) || env.DEFAULT_TOKEN!;

        const status = await getTaskStatus(taskId, token);
        return jsonResponse(status);
      }

      // 文生图（异步模式）
      if (path === '/v1/images/generations' && method === 'POST') {
        const body = await request.json() as any;
        
        // 验证必填参数
        if (!body.prompt || typeof body.prompt !== 'string') {
          return errorResponse('prompt 参数是必填的');
        }

        // 获取 token
        const authorization = request.headers.get('Authorization');
        const tokens = tokenSplit(authorization);
        if (tokens.length === 0 && !env.DEFAULT_TOKEN) {
          return errorResponse('Authorization header 是必需的', 401);
        }
        const token = sample(tokens) || env.DEFAULT_TOKEN!;

        // 解析参数
        const {
          model = DEFAULT_IMAGE_MODEL,
          prompt,
          negative_prompt: negativePrompt,
          ratio = '1:1',
          resolution = '2k',
          sample_strength: sampleStrength = 0.5,
        } = body;

        // 提交任务
        const { taskId, submitId } = await submitImageTask(model, prompt, {
          ratio,
          resolution,
          sampleStrength,
          negativePrompt,
        }, token);

        return jsonResponse({
          task_id: taskId,
          submit_id: submitId,
          status: 'pending',
          message: '任务已提交，请通过 GET /v1/images/tasks/{task_id} 查询状态',
          created: unixTimestamp(),
        });
      }

      // 图生图（异步模式）
      if (path === '/v1/images/compositions' && method === 'POST') {
        const body = await request.json() as any;
        
        // 验证必填参数
        if (!body.prompt || typeof body.prompt !== 'string') {
          return errorResponse('prompt 参数是必填的');
        }
        if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
          return errorResponse('至少需要提供1张输入图片');
        }
        if (body.images.length > 10) {
          return errorResponse('最多支持10张输入图片');
        }

        // 获取 token
        const authorization = request.headers.get('Authorization');
        const tokens = tokenSplit(authorization);
        if (tokens.length === 0 && !env.DEFAULT_TOKEN) {
          return errorResponse('Authorization header 是必需的', 401);
        }
        const token = sample(tokens) || env.DEFAULT_TOKEN!;

        // 解析参数
        const {
          model = DEFAULT_IMAGE_MODEL,
          prompt,
          images,
          negative_prompt: negativePrompt,
          ratio = '1:1',
          resolution = '2k',
          sample_strength: sampleStrength = 0.5,
        } = body;

        // 提取图片 URL
        const imageUrls = images.map((img: any) => typeof img === 'string' ? img : img.url);

        // 提交任务
        const { taskId, submitId } = await submitCompositionTask(model, prompt, imageUrls, {
          ratio,
          resolution,
          sampleStrength,
          negativePrompt,
        }, token);

        return jsonResponse({
          task_id: taskId,
          submit_id: submitId,
          status: 'pending',
          message: '任务已提交，请通过 GET /v1/images/tasks/{task_id} 查询状态',
          input_images: imageUrls.length,
          created: unixTimestamp(),
        });
      }

      // 获取历史记录（兼容旧接口）
      if (path === '/v1/images/history' && method === 'POST') {
        const body = await request.json() as any;
        
        if (!body.submit_ids || !Array.isArray(body.submit_ids) || body.submit_ids.length === 0) {
          return errorResponse('至少需要提供1个submit_id');
        }

        // 获取 token
        const authorization = request.headers.get('Authorization');
        const tokens = tokenSplit(authorization);
        if (tokens.length === 0 && !env.DEFAULT_TOKEN) {
          return errorResponse('Authorization header 是必需的', 401);
        }
        const token = sample(tokens) || env.DEFAULT_TOKEN!;

        const histories = await getHistoryBySubmitIds(body.submit_ids, token);

        return jsonResponse({
          created: unixTimestamp(),
          data: histories,
        });
      }

      // 404
      return errorResponse('Not Found', 404);

    } catch (error: any) {
      console.error('Error:', error);
      return errorResponse(error.message || 'Internal Server Error', 500);
    }
  },
};
