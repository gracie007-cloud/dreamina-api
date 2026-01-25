/**
 * 图像生成模块
 * 基于 jimeng-api 项目最新版本的 payload-builder
 * 支持异步任务模式，避免 Workers 超时
 */

import { request, getCredit, parseRegionFromToken, getAssistantId, DreaminaAPIError } from './api';
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_IMAGE_MODEL_US,
  IMAGE_MODEL_MAP,
  IMAGE_MODEL_MAP_US,
  STATUS_CODE_MAP,
  RESOLUTION_OPTIONS,
  DRAFT_VERSION,
  DRAFT_MIN_VERSION,
  RegionInfo,
} from './consts';
import { uuid, calculateCRC32 } from './utils';
import { createSignature } from './aws-signature';

/**
 * 任务状态
 */
export interface TaskStatus {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  images?: string[];
  error?: string;
  createdAt: number;
}

/**
 * 获取模型映射
 */
function getModel(model: string, isInternational: boolean): { model: string; userModel: string } {
  const modelMap = isInternational ? IMAGE_MODEL_MAP_US : IMAGE_MODEL_MAP;
  const defaultModel = isInternational ? DEFAULT_IMAGE_MODEL_US : DEFAULT_IMAGE_MODEL;

  if (!modelMap[model]) {
    console.log(`模型 "${model}" 不存在，使用默认模型 "${defaultModel}"`);
    return { model: modelMap[defaultModel], userModel: defaultModel };
  }

  return { model: modelMap[model], userModel: model };
}

/**
 * 解析分辨率
 */
function resolveResolution(
  userModel: string,
  resolution: string = "2k",
  ratio: string = "1:1"
): { width: number; height: number; imageRatio: number; resolutionType: string } {
  const resolutionGroup = RESOLUTION_OPTIONS[resolution];
  if (!resolutionGroup) {
    console.warn(`不支持的分辨率 "${resolution}"，使用默认 2k`);
    return resolveResolution(userModel, "2k", ratio);
  }

  const ratioConfig = resolutionGroup[ratio];
  if (!ratioConfig) {
    console.warn(`在 "${resolution}" 分辨率下不支持比例 "${ratio}"，使用默认 1:1`);
    return resolveResolution(userModel, resolution, "1:1");
  }

  return {
    width: ratioConfig.width,
    height: ratioConfig.height,
    imageRatio: ratioConfig.ratio,
    resolutionType: resolution,
  };
}

/**
 * 获取 benefitCount
 */
function getBenefitCount(userModel: string, regionInfo: RegionInfo): number | undefined {
  if (regionInfo.isCN) return undefined;
  if (regionInfo.isUS) return 4;
  // HK/JP/SG
  return 4;
}

/**
 * 构建 core_param
 */
function buildCoreParam(options: {
  model: string;
  prompt: string;
  negativePrompt?: string;
  seed: number;
  sampleStrength: number;
  resolution: { width: number; height: number; imageRatio: number; resolutionType: string };
  intelligentRatio?: boolean;
}): any {
  const { model, prompt, negativePrompt, seed, sampleStrength, resolution, intelligentRatio } = options;

  const coreParam: any = {
    type: "",
    id: uuid(),
    model,
    prompt,
    seed,
    sample_strength: sampleStrength,
    image_ratio: resolution.imageRatio,
    large_image_info: {
      type: "",
      id: uuid(),
      min_version: DRAFT_MIN_VERSION,
      height: resolution.height,
      width: resolution.width,
      resolution_type: resolution.resolutionType,
    },
    intelligent_ratio: intelligentRatio || false,
  };

  if (negativePrompt) {
    coreParam.negative_prompt = negativePrompt;
  }

  return coreParam;
}

/**
 * 构建 metrics_extra
 */
function buildMetricsExtra(options: {
  userModel: string;
  regionInfo: RegionInfo;
  submitId: string;
  resolutionType: string;
}): string {
  const { userModel, regionInfo, submitId, resolutionType } = options;

  const benefitCount = getBenefitCount(userModel, regionInfo);

  const sceneOption: any = {
    type: "image",
    scene: "ImageBasicGenerate",
    modelReqKey: userModel,
    resolutionType: resolutionType,
    reportParams: {
      enterSource: "generate",
      vipSource: "generate",
      extraVipFunctionKey: `${userModel}-${resolutionType}`,
      useVipFunctionDetailsReporterHoc: true,
    },
  };

  if (benefitCount !== undefined) {
    sceneOption.benefitCount = benefitCount;
  }

  return JSON.stringify({
    promptSource: "custom",
    generateCount: 1,
    enterFrom: "click",
    sceneOptions: JSON.stringify([sceneOption]),
    generateId: submitId,
    isRegenerate: false,
  });
}

/**
 * 构建 draft_content
 */
function buildDraftContent(options: {
  componentId: string;
  coreParam: any;
}): string {
  const { componentId, coreParam } = options;

  const draftContent = {
    type: "draft",
    id: uuid(),
    min_version: DRAFT_MIN_VERSION,
    min_features: [],
    is_from_tsn: true,
    version: DRAFT_VERSION,
    main_component_id: componentId,
    component_list: [
      {
        type: "image_base_component",
        id: componentId,
        min_version: DRAFT_MIN_VERSION,
        aigc_mode: "workbench",
        metadata: {
          type: "",
          id: uuid(),
          created_platform: 3,
          created_platform_version: "",
          created_time_in_ms: Date.now().toString(),
          created_did: "",
        },
        generate_type: "generate",
        abilities: {
          type: "",
          id: uuid(),
          generate: {
            type: "",
            id: uuid(),
            core_param: coreParam,
          },
          gen_option: {
            type: "",
            id: uuid(),
            generate_all: false,
          },
        },
      },
    ],
  };

  return JSON.stringify(draftContent);
}

/**
 * 提交文生图任务（异步模式）
 * 立即返回 task_id，不等待生成完成
 */
export async function submitImageTask(
  _model: string,
  prompt: string,
  options: {
    ratio?: string;
    resolution?: string;
    sampleStrength?: number;
    negativePrompt?: string;
    intelligentRatio?: boolean;
  },
  refreshToken: string
): Promise<{ taskId: string; submitId: string }> {
  const {
    ratio = "1:1",
    resolution = "2k",
    sampleStrength = 0.5,
    negativePrompt = "",
    intelligentRatio = false,
  } = options;

  // 解析区域信息
  const regionInfo = parseRegionFromToken(refreshToken);
  console.log(`使用区域: ${regionInfo.region}, Token: ${regionInfo.token.substring(0, 10)}...`);

  // 获取模型映射
  const { model, userModel } = getModel(_model, regionInfo.isInternational);
  console.log(`使用模型: ${_model} -> ${userModel} -> ${model}`);

  // 解析分辨率
  const resolutionResult = resolveResolution(userModel, resolution, ratio);
  console.log(`分辨率: ${resolutionResult.width}x${resolutionResult.height}, 比例: ${ratio}`);

  const componentId = uuid();
  const submitId = uuid();

  // 构建 core_param
  const coreParam = buildCoreParam({
    model,
    prompt,
    negativePrompt,
    seed: Math.floor(Math.random() * 100000000) + 2500000000,
    sampleStrength,
    resolution: resolutionResult,
    intelligentRatio,
  });

  // 构建 metrics_extra
  const metricsExtra = buildMetricsExtra({
    userModel,
    regionInfo,
    submitId,
    resolutionType: resolutionResult.resolutionType,
  });

  // 构建 draft_content
  const draftContent = buildDraftContent({
    componentId,
    coreParam,
  });

  // 构建完整请求
  const requestData = {
    extend: {
      root_model: model,
    },
    submit_id: submitId,
    metrics_extra: metricsExtra,
    draft_content: draftContent,
    http_common_info: {
      aid: getAssistantId(regionInfo),
    },
  };

  console.log(`发送生成请求...`);

  const result = await request(
    "post",
    "/mweb/v1/aigc_draft/generate",
    refreshToken,
    {
      data: requestData,
    }
  );

  const historyId = result?.aigc_data?.history_record_id;
  if (!historyId) {
    console.error(`生成响应: ${JSON.stringify(result)}`);
    throw new Error("记录ID不存在");
  }

  console.log(`任务已提交，task_id: ${historyId}, submit_id: ${submitId}`);

  return {
    taskId: historyId,
    submitId: submitId,
  };
}

/**
 * 查询任务状态
 */
export async function getTaskStatus(
  taskId: string,
  refreshToken: string
): Promise<TaskStatus> {
  try {
    const result = await request("post", "/mweb/v1/get_history_by_ids", refreshToken, {
      data: {
        history_ids: [taskId],
        image_info: {
          width: 2048,
          height: 2048,
          format: "webp",
          image_scene_list: [
            { scene: "smart_crop", width: 360, height: 360, uniq_key: "smart_crop-w:360-h:360", format: "webp" },
            { scene: "smart_crop", width: 480, height: 480, uniq_key: "smart_crop-w:480-h:480", format: "webp" },
            { scene: "smart_crop", width: 720, height: 720, uniq_key: "smart_crop-w:720-h:720", format: "webp" },
            { scene: "normal", width: 2400, height: 2400, uniq_key: "2400", format: "webp" },
            { scene: "normal", width: 1080, height: 1080, uniq_key: "1080", format: "webp" },
            { scene: "normal", width: 720, height: 720, uniq_key: "720", format: "webp" },
            { scene: "normal", width: 480, height: 480, uniq_key: "480", format: "webp" },
            { scene: "normal", width: 360, height: 360, uniq_key: "360", format: "webp" },
          ],
        },
      },
    });

    if (!result[taskId]) {
      return {
        taskId,
        status: 'failed',
        error: '任务不存在',
        createdAt: Date.now(),
      };
    }

    const taskInfo = result[taskId];
    const status = taskInfo.status;
    const failCode = taskInfo.fail_code;
    const itemList = taskInfo.item_list || [];
    const totalCount = taskInfo.total_image_count || 4;
    const finishedCount = taskInfo.finished_image_count || itemList.length;

    // 提取图片 URL
    const images = extractImageUrls(itemList);

    // 计算进度
    const progress = Math.round((finishedCount / totalCount) * 100);

    // 任务成功完成
    if (status === 10 || status === 50) {
      return {
        taskId,
        status: 'completed',
        progress: 100,
        images,
        createdAt: Date.now(),
      };
    }

    // 任务失败
    if (status === 30) {
      let errorMsg = `生成失败，错误代码: ${failCode}`;
      if (failCode === '2038') {
        errorMsg = '内容由于合规问题已被阻止生成';
      }
      return {
        taskId,
        status: 'failed',
        error: errorMsg,
        createdAt: Date.now(),
      };
    }

    // 任务进行中
    return {
      taskId,
      status: images.length > 0 ? 'processing' : 'pending',
      progress,
      images: images.length > 0 ? images : undefined,
      createdAt: Date.now(),
    };

  } catch (error: any) {
    console.error(`查询任务状态失败: ${error.message}`);
    return {
      taskId,
      status: 'failed',
      error: error.message,
      createdAt: Date.now(),
    };
  }
}

/**
 * 从结果中提取图片 URL
 */
function extractImageUrls(itemList: any[]): string[] {
  return itemList.map((item: any) => {
    if (item?.image?.large_images?.[0]?.image_url) {
      return item.image.large_images[0].image_url;
    }
    if (item?.common_attr?.cover_url) {
      return item.common_attr.cover_url;
    }
    if (item?.image_url) {
      return item.image_url;
    }
    if (item?.url) {
      return item.url;
    }
    return null;
  }).filter((url: string | null): url is string => url !== null);
}

/**
 * 获取区域相关配置
 * 基于 jimeng-api 项目的 region-utils.ts 和 dreamina.ts
 */
function getRegionConfig(regionInfo: RegionInfo) {
  if (regionInfo.isUS) {
    return {
      imageXUrl: 'https://imagex16-normal-us-ttp.capcutapi.us',
      awsRegion: 'us-east-1',
      origin: 'https://dreamina.capcut.com',
      serviceId: 'wopfjsm1ax',
    };
  } else if (regionInfo.isHK || regionInfo.isJP || regionInfo.isSG) {
    return {
      imageXUrl: 'https://imagex-normal-sg.capcutapi.com',
      awsRegion: 'ap-southeast-1',
      origin: 'https://dreamina.capcut.com',
      serviceId: 'wopfjsm1ax',
    };
  } else {
    return {
      imageXUrl: 'https://imagex.bytedanceapi.com',
      awsRegion: 'cn-north-1',
      origin: 'https://jimeng.jianying.com',
      serviceId: 'tb4s082cfz',
    };
  }
}

/**
 * 从 URL 或 Base64 上传图片
 */
async function uploadImage(imageData: string, refreshToken: string): Promise<string> {
  const regionInfo = parseRegionFromToken(refreshToken);
  
  let imageBuffer: ArrayBuffer;
  let contentType = 'image/jpeg';
  
  // 判断是 URL 还是 Base64
  if (imageData.startsWith('data:')) {
    // Base64 格式
    const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('无效的 Base64 图片格式');
    }
    contentType = matches[1];
    const base64Data = matches[2];
    // 将 Base64 转换为 ArrayBuffer
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    imageBuffer = bytes.buffer;
  } else {
    // URL 格式 - 下载图片
    console.log(`下载图片: ${imageData.substring(0, 100)}...`);
    const response = await fetch(imageData);
    if (!response.ok) {
      throw new Error(`下载图片失败: ${response.status}`);
    }
    imageBuffer = await response.arrayBuffer();
    contentType = response.headers.get('content-type') || 'image/jpeg';
  }

  console.log(`开始上传图片... (大小: ${imageBuffer.byteLength} 字节)`);

  // 第一步：获取上传令牌
  const tokenResult = await request("post", "/mweb/v1/get_upload_token", refreshToken, {
    data: {
      scene: 2, // AIGC 图片上传场景
    },
  });

  const { access_key_id, secret_access_key, session_token } = tokenResult;
  const service_id = regionInfo.isInternational ? tokenResult.space_name : tokenResult.service_id;
  
  if (!access_key_id || !secret_access_key || !session_token) {
    throw new Error("获取上传令牌失败");
  }

  const regionConfig = getRegionConfig(regionInfo);
  const actualServiceId = service_id || regionConfig.serviceId;
  
  console.log(`获取上传令牌成功: service_id=${actualServiceId}`);

  // 准备文件信息
  const fileSize = imageBuffer.byteLength;
  const crc32 = calculateCRC32(imageBuffer);
  console.log(`图片信息: 大小=${fileSize}字节, CRC32=${crc32}`);

  // 第二步：申请图片上传权限
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:\-]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const randomStr = Math.random().toString(36).substring(2, 12);
  
  const applyUrl = `${regionConfig.imageXUrl}/?Action=ApplyImageUpload&Version=2018-08-01&ServiceId=${actualServiceId}&FileSize=${fileSize}&s=${randomStr}${regionInfo.isInternational ? '&device_platform=web' : ''}`;

  const requestHeaders: Record<string, string> = {
    'x-amz-date': timestamp,
    'x-amz-security-token': session_token
  };

  const authorization = await createSignature(
    'GET',
    applyUrl,
    requestHeaders,
    access_key_id,
    secret_access_key,
    session_token,
    '',
    regionConfig.awsRegion
  );

  console.log(`申请上传权限: ${applyUrl}`);

  const applyResponse = await fetch(applyUrl, {
    method: 'GET',
    headers: {
      'accept': '*/*',
      'accept-language': 'zh-CN,zh;q=0.9',
      'authorization': authorization,
      'origin': regionConfig.origin,
      'referer': `${regionConfig.origin}/ai-tool/generate`,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      'x-amz-date': timestamp,
      'x-amz-security-token': session_token,
    },
  });

  if (!applyResponse.ok) {
    const errorText = await applyResponse.text();
    throw new Error(`申请上传权限失败: ${applyResponse.status} - ${errorText}`);
  }

  const applyResult = await applyResponse.json() as any;
  
  if (applyResult?.ResponseMetadata?.Error) {
    throw new Error(`申请上传权限失败: ${JSON.stringify(applyResult.ResponseMetadata.Error)}`);
  }

  console.log(`申请上传权限成功`);

  // 解析上传信息
  const uploadAddress = applyResult?.Result?.UploadAddress;
  if (!uploadAddress || !uploadAddress.StoreInfos || !uploadAddress.UploadHosts) {
    throw new Error(`获取上传地址失败: ${JSON.stringify(applyResult)}`);
  }

  const storeInfo = uploadAddress.StoreInfos[0];
  const uploadHost = uploadAddress.UploadHosts[0];
  const auth = storeInfo.Auth;
  const uploadUrl = `https://${uploadHost}/upload/v1/${storeInfo.StoreUri}`;

  console.log(`准备上传图片: uploadUrl=${uploadUrl}`);

  // 第三步：上传图片文件
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Accept': '*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Authorization': auth,
      'Content-CRC32': crc32,
      'Content-Disposition': 'attachment; filename="image.jpg"',
      'Content-Type': 'application/octet-stream',
      'Origin': regionConfig.origin,
      'Referer': `${regionConfig.origin}/ai-tool/generate`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
    },
    body: imageBuffer,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`上传图片失败: ${uploadResponse.status} - ${errorText}`);
  }

  const uploadResult = await uploadResponse.json() as any;
  
  // 检查上传结果 - 成功时 code=2000, message="Success"
  if (uploadResult.code !== 2000 && uploadResult.message !== 'Success') {
    throw new Error(`上传图片失败: ${JSON.stringify(uploadResult)}`);
  }
  
  console.log(`图片文件上传成功, CRC32: ${uploadResult.data?.crc32}`);

  // 第四步：提交上传完成
  const commitUrl = `${regionConfig.imageXUrl}/?Action=CommitImageUpload&Version=2018-08-01&ServiceId=${actualServiceId}${regionInfo.isInternational ? '&device_platform=web' : ''}`;

  const commitTimestamp = new Date().toISOString().replace(/[:\-]/g, '').replace(/\.\d{3}Z$/, 'Z');
  
  // 按照 jimeng-api 的方式，使用 JSON body 传递 SessionKey
  const commitPayload = JSON.stringify({
    SessionKey: uploadAddress.SessionKey
  });
  
  // 计算 payload hash
  const payloadHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(commitPayload));
  const payloadHash = Array.from(new Uint8Array(payloadHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const commitHeaders: Record<string, string> = {
    'x-amz-date': commitTimestamp,
    'x-amz-security-token': session_token,
    'x-amz-content-sha256': payloadHash
  };

  const commitAuthorization = await createSignature(
    'POST',
    commitUrl,
    commitHeaders,
    access_key_id,
    secret_access_key,
    session_token,
    commitPayload,
    regionConfig.awsRegion
  );

  const commitResponse = await fetch(commitUrl, {
    method: 'POST',
    headers: {
      'accept': '*/*',
      'accept-language': 'zh-CN,zh;q=0.9',
      'authorization': commitAuthorization,
      'content-type': 'application/json',
      'origin': regionConfig.origin,
      'referer': `${regionConfig.origin}/ai-tool/generate`,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      'x-amz-date': commitTimestamp,
      'x-amz-security-token': session_token,
      'x-amz-content-sha256': payloadHash,
    },
    body: commitPayload,
  });

  if (!commitResponse.ok) {
    const errorText = await commitResponse.text();
    throw new Error(`提交上传失败: ${commitResponse.status} - ${errorText}`);
  }

  const commitResult = await commitResponse.json() as any;
  
  if (commitResult?.ResponseMetadata?.Error) {
    throw new Error(`提交上传失败: ${JSON.stringify(commitResult.ResponseMetadata.Error)}`);
  }

  const imageUri = commitResult?.Result?.PluginResult?.[0]?.ImageUri;
  if (!imageUri) {
    throw new Error(`获取图片URI失败: ${JSON.stringify(commitResult)}`);
  }

  console.log(`图片上传成功: ${imageUri}`);
  return imageUri;
}

/**
 * 提交图生图任务（异步模式）
 */
export async function submitCompositionTask(
  _model: string,
  prompt: string,
  imageUrls: string[],
  options: {
    ratio?: string;
    resolution?: string;
    sampleStrength?: number;
    negativePrompt?: string;
  },
  refreshToken: string
): Promise<{ taskId: string; submitId: string }> {
  const {
    ratio = "1:1",
    resolution = "2k",
    sampleStrength = 0.5,
    negativePrompt = "",
  } = options;

  // 解析区域信息
  const regionInfo = parseRegionFromToken(refreshToken);
  console.log(`使用区域: ${regionInfo.region}`);

  const { model, userModel } = getModel(_model, regionInfo.isInternational);
  const imageCount = imageUrls.length;
  console.log(`使用模型: ${userModel} 图生图功能 ${imageCount}张图片`);

  // 解析分辨率
  const resolutionResult = resolveResolution(userModel, resolution, ratio);

  // 上传所有输入图片
  const uploadedImageIds: string[] = [];
  for (let i = 0; i < imageUrls.length; i++) {
    try {
      const imageId = await uploadImage(imageUrls[i], refreshToken);
      uploadedImageIds.push(imageId);
      console.log(`图片 ${i + 1}/${imageCount} 上传成功: ${imageId}`);
    } catch (error: any) {
      console.error(`图片 ${i + 1}/${imageCount} 上传失败: ${error.message}`);
      throw new Error(`图片上传失败: ${error.message}`);
    }
  }

  const componentId = uuid();
  const submitId = uuid();

  // 构建 core_param（图生图模式）
  const promptPrefix = '#'.repeat(imageCount * 2);
  const coreParam: any = {
    type: "",
    id: uuid(),
    model,
    prompt: `${promptPrefix}${prompt}`,
    sample_strength: sampleStrength,
    image_ratio: resolutionResult.imageRatio,
    large_image_info: {
      type: "",
      id: uuid(),
      min_version: DRAFT_MIN_VERSION,
      height: resolutionResult.height,
      width: resolutionResult.width,
      resolution_type: resolutionResult.resolutionType,
    },
    intelligent_ratio: false,
  };

  if (negativePrompt) {
    coreParam.negative_prompt = negativePrompt;
  }

  // 构建 ability_list
  const abilityList = uploadedImageIds.map((imageId) => ({
    type: "",
    id: uuid(),
    name: "byte_edit",
    image_uri_list: [imageId],
    image_list: [
      {
        type: "image",
        id: uuid(),
        source_from: "upload",
        platform_type: 1,
        name: "",
        image_uri: imageId,
        width: 0,
        height: 0,
        format: "",
        uri: imageId,
      },
    ],
    strength: sampleStrength,
  }));

  // 构建 prompt_placeholder_info_list
  const promptPlaceholderInfoList = uploadedImageIds.map((_, index) => ({
    type: "",
    id: uuid(),
    ability_index: index,
  }));

  // 构建 metrics_extra
  const metricsAbilityList = uploadedImageIds.map(() => ({
    abilityName: "byte_edit",
    strength: sampleStrength,
    source: {
      imageUrl: `blob:https://dreamina.capcut.com/${uuid()}`
    }
  }));

  const benefitCount = getBenefitCount(userModel, regionInfo);
  const sceneOption: any = {
    type: "image",
    scene: "ImageBasicGenerate",
    modelReqKey: userModel,
    resolutionType: resolutionResult.resolutionType,
    abilityList: metricsAbilityList,
    reportParams: {
      enterSource: "generate",
      vipSource: "generate",
      extraVipFunctionKey: `${userModel}-${resolutionResult.resolutionType}`,
      useVipFunctionDetailsReporterHoc: true,
    },
  };
  if (benefitCount !== undefined) {
    sceneOption.benefitCount = benefitCount;
  }

  const metricsExtra = JSON.stringify({
    promptSource: "custom",
    generateCount: 1,
    enterFrom: "click",
    sceneOptions: JSON.stringify([sceneOption]),
    generateId: submitId,
    isRegenerate: false,
  });

  // 构建 draft_content
  const draftContent = JSON.stringify({
    type: "draft",
    id: uuid(),
    min_version: "3.2.9",
    min_features: [],
    is_from_tsn: true,
    version: DRAFT_VERSION,
    main_component_id: componentId,
    component_list: [
      {
        type: "image_base_component",
        id: componentId,
        min_version: DRAFT_MIN_VERSION,
        aigc_mode: "workbench",
        metadata: {
          type: "",
          id: uuid(),
          created_platform: 3,
          created_platform_version: "",
          created_time_in_ms: Date.now().toString(),
          created_did: "",
        },
        generate_type: "blend",
        abilities: {
          type: "",
          id: uuid(),
          blend: {
            type: "",
            id: uuid(),
            ...(imageCount >= 2 ? { min_version: "3.2.9" } : {}),
            min_features: [],
            core_param: coreParam,
            ability_list: abilityList,
            prompt_placeholder_info_list: promptPlaceholderInfoList,
            postedit_param: {
              type: "",
              id: uuid(),
              generate_type: 0
            },
          },
          gen_option: {
            type: "",
            id: uuid(),
            generate_all: false,
          },
        },
      },
    ],
  });

  // 构建完整请求
  const requestData = {
    extend: {
      root_model: model,
    },
    submit_id: submitId,
    metrics_extra: metricsExtra,
    draft_content: draftContent,
    http_common_info: {
      aid: getAssistantId(regionInfo),
    },
  };

  const result = await request(
    "post",
    "/mweb/v1/aigc_draft/generate",
    refreshToken,
    { data: requestData }
  );

  const historyId = result?.aigc_data?.history_record_id;
  if (!historyId) {
    throw new Error("记录ID不存在");
  }

  console.log(`图生图任务已提交，task_id: ${historyId}, submit_id: ${submitId}`);

  return {
    taskId: historyId,
    submitId: submitId,
  };
}

/**
 * 获取历史记录（兼容旧接口）
 */
export async function getHistoryBySubmitIds(
  submitIds: string[],
  refreshToken: string
): Promise<any[]> {
  console.log(`通过submit_ids获取历史记录: ${submitIds.join(', ')}`);

  const result = await request("post", "/mweb/v1/get_history_by_ids", refreshToken, {
    data: {
      submit_ids: submitIds,
    },
  });

  const histories: any[] = [];
  for (const submitId of submitIds) {
    if (result[submitId]) {
      histories.push(result[submitId]);
    }
  }

  return histories;
}
