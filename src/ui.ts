/**
 * 可视化 Web 界面
 */

export const uiHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dreamina AI 图像生成器</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --primary: #6366f1;
      --primary-dark: #4f46e5;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --bg: #0f172a;
      --bg-card: #1e293b;
      --bg-input: #334155;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --border: #475569;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.6;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }
    
    header {
      text-align: center;
      padding: 30px 0;
      border-bottom: 1px solid var(--border);
      margin-bottom: 30px;
    }
    
    header h1 {
      font-size: 2.5em;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 10px;
    }
    
    header p {
      color: var(--text-muted);
      font-size: 1.1em;
    }
    
    .main-grid {
      display: grid;
      grid-template-columns: 400px 1fr;
      gap: 30px;
    }
    
    @media (max-width: 1024px) {
      .main-grid {
        grid-template-columns: 1fr;
      }
    }
    
    .card {
      background: var(--bg-card);
      border-radius: 16px;
      padding: 24px;
      border: 1px solid var(--border);
    }
    
    .card-title {
      font-size: 1.2em;
      font-weight: 600;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .card-title .icon {
      font-size: 1.4em;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--text);
    }
    
    .form-group .hint {
      font-size: 0.85em;
      color: var(--text-muted);
      margin-top: 4px;
    }
    
    input, textarea, select {
      width: 100%;
      padding: 12px 16px;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-size: 14px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    
    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }
    
    textarea {
      resize: vertical;
      min-height: 100px;
    }
    
    .token-list {
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      min-height: 120px;
      max-height: 200px;
      overflow-y: auto;
    }
    
    .token-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--bg-card);
      border-radius: 6px;
      margin-bottom: 8px;
      font-family: monospace;
      font-size: 13px;
    }
    
    .token-item:last-child {
      margin-bottom: 0;
    }
    
    .token-item .token-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 10px;
    }
    
    .token-item .remove-btn {
      background: var(--danger);
      color: white;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .token-item .remove-btn:hover {
      background: #dc2626;
    }
    
    .token-input-group {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }
    
    .token-input-group input {
      flex: 1;
    }
    
    .token-input-group button {
      padding: 12px 20px;
      white-space: nowrap;
    }
    
    .token-count {
      font-size: 0.85em;
      color: var(--text-muted);
      margin-top: 8px;
    }
    
    .token-count.has-tokens {
      color: var(--success);
    }
    
    .row {
      display: flex;
      gap: 15px;
    }
    
    .row .form-group {
      flex: 1;
    }
    
    button {
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 14px 28px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }
    
    button:hover {
      background: var(--primary-dark);
    }
    
    button:active {
      transform: scale(0.98);
    }
    
    button:disabled {
      background: var(--border);
      cursor: not-allowed;
      transform: none;
    }
    
    .btn-secondary {
      background: var(--bg-input);
      border: 1px solid var(--border);
    }
    
    .btn-secondary:hover {
      background: var(--border);
    }
    
    .btn-full {
      width: 100%;
    }
    
    .generate-btn {
      font-size: 18px;
      padding: 16px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    .generate-btn:hover {
      background: linear-gradient(135deg, #5a5cd6 0%, #6a4190 100%);
    }
    
    .results-area {
      min-height: 400px;
    }
    
    .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
    
    .result-item {
      background: var(--bg-input);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .result-item:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    
    .result-item img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      display: block;
    }
    
    .result-item .actions {
      padding: 12px;
      display: flex;
      gap: 10px;
    }
    
    .result-item .actions button {
      flex: 1;
      padding: 10px;
      font-size: 14px;
    }
    
    .status {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
    }
    
    .status .icon {
      font-size: 4em;
      margin-bottom: 20px;
    }
    
    .status.loading .icon {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .status h3 {
      font-size: 1.3em;
      margin-bottom: 10px;
      color: var(--text);
    }
    
    .error-msg {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--danger);
      color: var(--danger);
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .success-msg {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid var(--success);
      color: var(--success);
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .mode-tabs {
      display: flex;
      gap: 0;
      background: var(--bg-input);
      border-radius: 8px;
      padding: 4px;
    }
    
    .mode-tab {
      flex: 1;
      padding: 10px 16px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 14px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .mode-tab:hover {
      color: var(--text);
    }
    
    .mode-tab.active {
      background: var(--primary);
      color: white;
    }
    
    .image-upload-area {
      border: 2px dashed var(--border);
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .image-upload-area:hover {
      border-color: var(--primary);
      background: rgba(99, 102, 241, 0.05);
    }
    
    .upload-placeholder {
      color: var(--text-muted);
    }
    
    .uploaded-images {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 15px;
    }
    
    .uploaded-image-item {
      position: relative;
      width: 80px;
      height: 80px;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid var(--border);
    }
    
    .uploaded-image-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .uploaded-image-item .remove-img-btn {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--danger);
      color: white;
      border: none;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    
    .ratio-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    
    .ratio-btn {
      padding: 10px 8px;
      font-size: 13px;
      background: var(--bg-input);
      border: 2px solid var(--border);
      color: var(--text);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .ratio-btn:hover {
      border-color: var(--primary);
    }
    
    .ratio-btn.active {
      border-color: var(--primary);
      background: rgba(99, 102, 241, 0.2);
    }
    
    .history-section {
      margin-top: 30px;
      padding-top: 30px;
      border-top: 1px solid var(--border);
    }
    
    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .tab-btn {
      padding: 10px 20px;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 14px;
    }
    
    .tab-btn.active {
      background: var(--primary);
      border-color: var(--primary);
      color: white;
    }
    
    /* Lightbox */
    .lightbox {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 1000;
      justify-content: center;
      align-items: center;
    }
    
    .lightbox.show {
      display: flex;
    }
    
    .lightbox img {
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
    }
    
    .lightbox .close-btn {
      position: absolute;
      top: 20px;
      right: 20px;
      background: transparent;
      color: white;
      font-size: 2em;
      padding: 10px;
    }
    
    .footer {
      text-align: center;
      padding: 30px;
      color: var(--text-muted);
      font-size: 14px;
      margin-top: 40px;
      border-top: 1px solid var(--border);
    }
    
    .footer a {
      color: var(--primary);
      text-decoration: none;
    }
    
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🎨 Dreamina AI 图像生成器</h1>
      <p>即梦海外版 | 支持 Image 4.5/4.1/4.0 模型</p>
    </header>
    
    <div class="main-grid">
      <!-- 左侧控制面板 -->
      <div class="control-panel">
        <!-- Session ID 管理 -->
        <div class="card" style="margin-bottom: 20px;">
          <div class="card-title">
            <span class="icon">🔑</span>
            Session ID 管理
          </div>
          
          <div class="form-group">
            <label>已添加的 Session ID</label>
            <div class="token-list" id="tokenList">
              <div class="status" style="padding: 20px;">
                <p>暂无 Session ID，请在下方添加</p>
              </div>
            </div>
            <div class="token-count" id="tokenCount">已添加 0 个 Session ID</div>
          </div>
          
          <div class="token-input-group">
            <input type="text" id="newToken" placeholder="输入 Session ID（如 us-abc123xyz789）...">
            <button type="button" class="btn-secondary" onclick="addToken()">添加</button>
          </div>
          <p class="hint" style="margin-top: 8px;">
            支持添加多个 Session ID，生成时随机选择使用<br>
            <strong>重要:</strong> 海外站需要添加区域前缀！美国站加 <code style="background:#334155;padding:2px 4px;border-radius:3px;">us-</code>，香港站加 <code style="background:#334155;padding:2px 4px;border-radius:3px;">hk-</code>，日本站加 <code style="background:#334155;padding:2px 4px;border-radius:3px;">jp-</code>，新加坡站加 <code style="background:#334155;padding:2px 4px;border-radius:3px;">sg-</code><br>
            例如: <code style="background:#334155;padding:2px 4px;border-radius:3px;">us-abc123xyz789</code>
          </p>
        </div>
        
        <!-- 生成设置 -->
        <div class="card">
          <div class="card-title">
            <span class="icon">⚙️</span>
            生成设置
          </div>
          
          <div class="form-group">
            <label>生成模式</label>
            <div class="mode-tabs">
              <button type="button" class="mode-tab active" data-mode="text2img" onclick="switchMode('text2img')">文生图</button>
              <button type="button" class="mode-tab" data-mode="img2img" onclick="switchMode('img2img')">图生图</button>
            </div>
          </div>
          
          <div id="img2imgSection" style="display: none;">
            <div class="form-group">
              <label>参考图片 (支持 1-10 张)</label>
              <div class="image-upload-area" id="imageUploadArea">
                <div class="upload-placeholder" onclick="document.getElementById('imageInput').click()">
                  <span style="font-size: 2em;">🖼️</span>
                  <p>点击添加图片或输入图片 URL</p>
                </div>
                <input type="file" id="imageInput" accept="image/*" multiple style="display: none;" onchange="handleImageUpload(event)">
              </div>
              <div class="uploaded-images" id="uploadedImages"></div>
              <div class="token-input-group" style="margin-top: 10px;">
                <input type="text" id="imageUrlInput" placeholder="输入图片 URL...">
                <button type="button" class="btn-secondary" onclick="addImageUrl()">添加</button>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label>提示词 (Prompt)</label>
            <textarea id="prompt" placeholder="描述你想要生成的图片内容...&#10;例如：一只可爱的橘猫在阳光下打盹，柔和的光线，高清摄影"></textarea>
          </div>
          
          <div class="form-group">
            <label>负向提示词 (可选)</label>
            <input type="text" id="negativePrompt" placeholder="不想出现的内容...">
          </div>
          
          <div class="row">
            <div class="form-group">
              <label>模型</label>
              <select id="model">
                <option value="dreamina-4.5">Image 4.5 (推荐)</option>
                <option value="dreamina-4.1">Image 4.1</option>
                <option value="dreamina-4.0">Image 4.0</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>精细度</label>
              <select id="sampleStrength">
                <option value="0.3">低 (0.3)</option>
                <option value="0.5" selected>中 (0.5)</option>
                <option value="0.7">高 (0.7)</option>
                <option value="0.9">极高 (0.9)</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>图片比例</label>
            <div class="ratio-grid">
              <button type="button" class="ratio-btn active" data-ratio="1:1">1:1</button>
              <button type="button" class="ratio-btn" data-ratio="4:3">4:3</button>
              <button type="button" class="ratio-btn" data-ratio="3:4">3:4</button>
              <button type="button" class="ratio-btn" data-ratio="16:9">16:9</button>
              <button type="button" class="ratio-btn" data-ratio="9:16">9:16</button>
              <button type="button" class="ratio-btn" data-ratio="3:2">3:2</button>
              <button type="button" class="ratio-btn" data-ratio="2:3">2:3</button>
              <button type="button" class="ratio-btn" data-ratio="21:9">21:9</button>
            </div>
          </div>
          
          <button class="generate-btn btn-full" id="generateBtn" onclick="generateImages()">
            ✨ 生成图片
          </button>
          
          <div id="errorMsg" class="error-msg" style="display: none; margin-top: 15px;"></div>
        </div>
      </div>
      
      <!-- 右侧结果区域 -->
      <div class="card results-area">
        <div class="card-title">
          <span class="icon">🖼️</span>
          生成结果
        </div>
        
        <div id="resultsContainer">
          <div class="status" id="emptyStatus">
            <div class="icon">🎨</div>
            <h3>准备就绪</h3>
            <p>填写提示词并点击生成按钮开始创作</p>
          </div>
        </div>
      </div>
    </div>
    
    <footer class="footer">
    <p>A嘉技术 | 项目 <a href="https://github.com/LiJunYi2/dreamina-api" target="_blank">Github</a></p>
      <p style="margin-top: 8px;">⚠️ 请合理使用，遵守相关法律法规</p>
    </footer>
  </div>
  
  <!-- Lightbox -->
  <div class="lightbox" id="lightbox" onclick="closeLightbox()">
    <button class="close-btn" onclick="closeLightbox()">×</button>
    <img id="lightboxImg" src="" alt="">
  </div>
  
  <script>
    // 存储 Session IDs
    let tokens = [];
    let selectedRatio = '1:1';
    let isGenerating = false;
    let currentMode = 'text2img';
    let uploadedImages = []; // 存储上传的图片 URL
    
    // 切换生成模式
    function switchMode(mode) {
      currentMode = mode;
      document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
      });
      document.getElementById('img2imgSection').style.display = mode === 'img2img' ? 'block' : 'none';
      
      // 更新按钮文本
      const btn = document.getElementById('generateBtn');
      btn.textContent = mode === 'text2img' ? '✨ 生成图片' : '✨ 图生图';
    }
    
    // 处理图片上传
    function handleImageUpload(event) {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      
      for (let i = 0; i < files.length; i++) {
        if (uploadedImages.length >= 10) {
          showError('最多支持 10 张图片');
          break;
        }
        
        const file = files[i];
        const reader = new FileReader();
        reader.onload = function(e) {
          uploadedImages.push({
            type: 'base64',
            data: e.target.result,
            name: file.name
          });
          renderUploadedImages();
        };
        reader.readAsDataURL(file);
      }
      
      // 清空 input
      event.target.value = '';
    }
    
    // 添加图片 URL
    function addImageUrl() {
      const input = document.getElementById('imageUrlInput');
      const url = input.value.trim();
      
      if (!url) {
        showError('请输入图片 URL');
        return;
      }
      
      if (uploadedImages.length >= 10) {
        showError('最多支持 10 张图片');
        return;
      }
      
      // 简单验证 URL 格式
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showError('请输入有效的图片 URL');
        return;
      }
      
      uploadedImages.push({
        type: 'url',
        data: url,
        name: url.split('/').pop() || 'image'
      });
      renderUploadedImages();
      input.value = '';
      hideError();
    }
    
    // 删除上传的图片
    function removeUploadedImage(index) {
      uploadedImages.splice(index, 1);
      renderUploadedImages();
    }
    
    // 渲染上传的图片列表
    function renderUploadedImages() {
      const container = document.getElementById('uploadedImages');
      if (uploadedImages.length === 0) {
        container.innerHTML = '';
        return;
      }
      
      container.innerHTML = uploadedImages.map((img, index) => {
        const src = img.type === 'base64' ? img.data : img.data;
        return '<div class="uploaded-image-item"><img src="' + src + '" alt="' + img.name + '"><button type="button" class="remove-img-btn" onclick="removeUploadedImage(' + index + ')">×</button></div>';
      }).join('');
    }
    
    // 从 localStorage 加载 tokens
    function loadTokens() {
      const saved = localStorage.getItem('dreamina_tokens');
      if (saved) {
        tokens = JSON.parse(saved);
        renderTokenList();
      }
    }
    
    // 保存 tokens 到 localStorage
    function saveTokens() {
      localStorage.setItem('dreamina_tokens', JSON.stringify(tokens));
    }
    
    // 渲染 token 列表
    function renderTokenList() {
      const container = document.getElementById('tokenList');
      const countEl = document.getElementById('tokenCount');
      
      if (tokens.length === 0) {
        container.innerHTML = '<div class="status" style="padding: 20px;"><p>暂无 Session ID，请在下方添加</p></div>';
        countEl.textContent = '已添加 0 个 Session ID';
        countEl.className = 'token-count';
      } else {
        container.innerHTML = tokens.map((token, index) => \`
          <div class="token-item">
            <span class="token-text">\${maskToken(token)}</span>
            <button class="remove-btn" onclick="removeToken(\${index})">删除</button>
          </div>
        \`).join('');
        countEl.textContent = \`已添加 \${tokens.length} 个 Session ID\`;
        countEl.className = 'token-count has-tokens';
      }
    }
    
    // 遮蔽 token 显示
    function maskToken(token) {
      if (token.length <= 10) return token;
      return token.substring(0, 6) + '...' + token.substring(token.length - 4);
    }
    
    // 添加 token
    function addToken() {
      const input = document.getElementById('newToken');
      const token = input.value.trim();
      
      if (!token) {
        showError('请输入 Session ID');
        return;
      }
      
      if (tokens.includes(token)) {
        showError('该 Session ID 已存在');
        return;
      }
      
      tokens.push(token);
      saveTokens();
      renderTokenList();
      input.value = '';
      hideError();
    }
    
    // 删除 token
    function removeToken(index) {
      tokens.splice(index, 1);
      saveTokens();
      renderTokenList();
    }
    
    // 随机选择 token
    function getRandomToken() {
      if (tokens.length === 0) return null;
      return tokens[Math.floor(Math.random() * tokens.length)];
    }
    
    // 显示错误
    function showError(msg) {
      const el = document.getElementById('errorMsg');
      el.textContent = msg;
      el.style.display = 'block';
    }
    
    // 隐藏错误
    function hideError() {
      document.getElementById('errorMsg').style.display = 'none';
    }
    
    // 比例选择
    document.querySelectorAll('.ratio-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedRatio = btn.dataset.ratio;
      });
    });
    
    // 当前任务状态
    let currentTaskId = null;
    let pollTimer = null;
    let currentToken = null;
    
    // 生成图片（异步模式）
    async function generateImages() {
      if (isGenerating) return;
      
      hideError();
      
      const token = getRandomToken();
      if (!token) {
        showError('请先添加至少一个 Session ID');
        return;
      }
      
      const prompt = document.getElementById('prompt').value.trim();
      if (!prompt) {
        showError('请输入提示词');
        return;
      }
      
      // 图生图模式检查
      if (currentMode === 'img2img' && uploadedImages.length === 0) {
        showError('请至少添加一张参考图片');
        return;
      }
      
      const model = document.getElementById('model').value;
      const negativePrompt = document.getElementById('negativePrompt').value.trim();
      const sampleStrength = parseFloat(document.getElementById('sampleStrength').value);
      
      isGenerating = true;
      currentToken = token;
      const btn = document.getElementById('generateBtn');
      btn.disabled = true;
      btn.textContent = '⏳ 提交中...';
      
      // 显示加载状态
      document.getElementById('resultsContainer').innerHTML = '<div class="status loading"><div class="icon">⏳</div><h3>正在提交任务...</h3><p>请稍候</p></div>';
      
      try {
        // 根据模式选择 API 端点
        const apiEndpoint = currentMode === 'img2img' ? '/v1/images/compositions' : '/v1/images/generations';
        
        // 构建请求体
        const requestBody = {
          prompt,
          model,
          ratio: selectedRatio,
          negative_prompt: negativePrompt || undefined,
          sample_strength: sampleStrength
        };
        
        // 图生图模式添加图片
        if (currentMode === 'img2img') {
          requestBody.images = uploadedImages.map(img => img.data);
        }
        
        // 提交生成任务
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          const errorMsg = data.error?.message || '提交失败';
          if (errorMsg.includes('积分不足') || errorMsg.includes('credits') || errorMsg.includes('1006')) {
            throw new Error('积分不足！请登录 Dreamina 网站 (dreamina.capcut.com) 领取免费积分或购买积分后重试。');
          }
          throw new Error(errorMsg);
        }
        
        // 获取任务 ID 并开始轮询
        currentTaskId = data.task_id;
        btn.textContent = '⏳ 生成中...';
        
        document.getElementById('resultsContainer').innerHTML = '<div class="status loading"><div class="icon">⏳</div><h3>任务已提交</h3><p>正在等待生成，这可能需要 1-2 分钟...</p><div style="margin-top: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; height: 8px; overflow: hidden;"><div id="progressBar" style="height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); width: 5%; transition: width 0.3s;"></div></div><p id="progressText" style="margin-top: 10px; font-size: 14px;">进度: 5%</p></div>';
        
        // 开始轮询任务状态
        startPolling();
        
      } catch (error) {
        showError(error.message);
        document.getElementById('resultsContainer').innerHTML = '<div class="status"><div class="icon">❌</div><h3>提交失败</h3><p>' + error.message + '</p></div>';
        resetGenerateButton();
      }
    }
    
    // 开始轮询任务状态
    function startPolling() {
      if (pollTimer) clearInterval(pollTimer);
      
      pollTimer = setInterval(async () => {
        try {
          const response = await fetch('/v1/images/tasks/' + currentTaskId, {
            headers: {
              'Authorization': 'Bearer ' + currentToken
            }
          });
          
          const data = await response.json();
          
          if (data.status === 'completed') {
            // 生成完成
            stopPolling();
            if (data.images && data.images.length > 0) {
              renderResults(data.images.map(url => ({ url })));
            } else {
              document.getElementById('resultsContainer').innerHTML = '<div class="status"><div class="icon">⚠️</div><h3>生成完成但无图片</h3><p>请重试</p></div>';
            }
            resetGenerateButton();
          } else if (data.status === 'failed') {
            // 生成失败
            stopPolling();
            document.getElementById('resultsContainer').innerHTML = '<div class="status"><div class="icon">❌</div><h3>生成失败</h3><p>' + (data.error || '未知错误') + '</p></div>';
            resetGenerateButton();
          } else {
            // 进行中，更新进度
            const progress = data.progress || (data.status === 'pending' ? 10 : 50);
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');
            if (progressBar) progressBar.style.width = progress + '%';
            if (progressText) progressText.textContent = '进度: ' + progress + '%';
            
            // 如果有部分图片，显示出来
            if (data.images && data.images.length > 0) {
              renderResults(data.images.map(url => ({ url })), true);
            }
          }
        } catch (error) {
          console.error('轮询错误:', error);
        }
      }, 2500); // 每 2.5 秒轮询一次
    }
    
    // 停止轮询
    function stopPolling() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }
    
    // 重置生成按钮
    function resetGenerateButton() {
      isGenerating = false;
      const btn = document.getElementById('generateBtn');
      btn.disabled = false;
      btn.textContent = '✨ 生成图片';
    }
    
    // 渲染结果
    function renderResults(images, isPartial = false) {
      const container = document.getElementById('resultsContainer');
      container.innerHTML = \`
        <div class="results-grid">
          \${images.map((img, index) => \`
            <div class="result-item">
              <img src="\${img.url}" alt="生成图片 \${index + 1}" onclick="openLightbox('\${img.url}')" style="cursor: pointer;">
              <div class="actions">
                <button class="btn-secondary" onclick="openLightbox('\${img.url}')">查看大图</button>
                <button onclick="downloadImage('\${img.url}', \${index})">下载</button>
              </div>
            </div>
          \`).join('')}
        </div>
      \`;
    }
    
    // 打开 lightbox
    function openLightbox(url) {
      document.getElementById('lightboxImg').src = url;
      document.getElementById('lightbox').classList.add('show');
    }
    
    // 关闭 lightbox
    function closeLightbox() {
      document.getElementById('lightbox').classList.remove('show');
    }
    
    // 下载图片
    async function downloadImage(url, index) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = \`dreamina_\${Date.now()}_\${index + 1}.png\`;
        link.click();
        URL.revokeObjectURL(link.href);
      } catch (error) {
        // 如果直接下载失败，尝试新窗口打开
        window.open(url, '_blank');
      }
    }
    
    // 键盘事件
    document.getElementById('newToken').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addToken();
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
    
    // 将函数暴露到全局作用域
    window.addToken = addToken;
    window.removeToken = removeToken;
    window.generateImages = generateImages;
    window.openLightbox = openLightbox;
    window.closeLightbox = closeLightbox;
    window.downloadImage = downloadImage;
    window.switchMode = switchMode;
    window.handleImageUpload = handleImageUpload;
    window.addImageUrl = addImageUrl;
    window.removeUploadedImage = removeUploadedImage;
    
    // 初始化
    loadTokens();
  </script>
</body>
</html>`;
