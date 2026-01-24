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
import { uuid } from './utils';

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

  if (regionInfo.isUS) {
    return ["jimeng-4.5", "jimeng-4.0", "jimeng-3.0", "dreamina-4.5", "dreamina-4.0"].includes(userModel) ? 4 : undefined;
  }

  if (regionInfo.isHK || regionInfo.isJP || regionInfo.isSG) {
    if (userModel === "nanobanana") return undefined;
    return 4;
  }

  return undefined;
}

/**
 * 构建 core_param
 */
function buildCoreParam(options: {
  model: string;
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  sampleStrength: number;
  resolution: { width: number; height: number; imageRatio: number; resolutionType: string };
  intelligentRatio?: boolean;
}): any {
  const {
    model,
    prompt,
    negativePrompt,
    seed,
    sampleStrength,
    resolution,
    intelligentRatio = false,
  } = options;

  const coreParam: any = {
    type: "",
    id: uuid(),
    model,
    prompt,
    sample_strength: sampleStrength,
    large_image_info: {
      type: "",
      id: uuid(),
      min_version: DRAFT_MIN_VERSION,
      height: resolution.height,
      width: resolution.width,
      resolution_type: resolution.resolutionType,
    },
    intelligent_ratio: intelligentRatio,
  };

  if (!intelligentRatio) {
    coreParam.image_ratio = resolution.imageRatio;
  }

  if (negativePrompt) {
    coreParam.negative_prompt = negativePrompt;
  }

  if (seed !== undefined) {
    coreParam.seed = seed;
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
    resolutionType,
    abilityList: [],
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

  const metrics: any = {
    promptSource: "custom",
    generateCount: 1,
    enterFrom: "click",
    sceneOptions: JSON.stringify([sceneOption]),
    generateId: submitId,
    isRegenerate: false,
  };

  return JSON.stringify(metrics);
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
      const imageId = await uploadImageFromUrl(imageUrls[i], refreshToken);
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
 * 从 URL 上传图片
 */
async function uploadImageFromUrl(imageUrl: string, refreshToken: string): Promise<string> {
  // 下载图片
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`下载图片失败: ${response.status}`);
  }
  
  const imageBuffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  
  // 获取上传凭证
  const uploadResult = await request("get", "/mweb/v1/upload_token", refreshToken, {
    params: {
      scene: "aigc_upload",
      file_count: 1,
    },
  });

  const uploadInfo = uploadResult.upload_info_list?.[0];
  if (!uploadInfo) {
    throw new Error("获取上传凭证失败");
  }

  const { upload_url, upload_params } = uploadInfo;
  
  // 上传图片
  const formData = new FormData();
  Object.entries(upload_params || {}).forEach(([key, value]) => {
    formData.append(key, value as string);
  });
  
  const blob = new Blob([imageBuffer], { type: contentType });
  formData.append('file', blob, 'image.jpg');

  const uploadResponse = await fetch(upload_url, {
    method: 'POST',
    body: formData,
  });

  if (!uploadResponse.ok) {
    throw new Error(`上传图片失败: ${uploadResponse.status}`);
  }

  const uploadResponseData = await uploadResponse.json() as any;
  return uploadResponseData.data?.image_uri || uploadResponseData.image_uri || '';
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
    const record = result[submitId];
    if (!record) {
      console.warn(`submit_id ${submitId} 的记录不存在`);
      continue;
    }

    const itemList = record.item_list || [];
    const images = itemList.map((item: any) => {
      const largeImage = item?.image?.large_images?.[0];
      return {
        id: item?.common_attr?.id || '',
        imageUrl: largeImage?.image_url || item?.common_attr?.cover_url || '',
        width: largeImage?.width || item?.common_attr?.cover_width || 0,
        height: largeImage?.height || item?.common_attr?.cover_height || 0,
        format: largeImage?.format || item?.image?.format || 'jpeg',
        coverUrlMap: item?.common_attr?.cover_url_map || {},
        description: item?.common_attr?.description || '',
        referencePrompt: item?.aigc_image_params?.reference_prompt || '',
      };
    });

    histories.push({
      submitId,
      status: record.status || 0,
      failCode: record.fail_code,
      failMsg: record.fail_msg,
      generateType: record.generate_type || 1,
      historyRecordId: record.history_record_id,
      finishTime: record.finish_time,
      totalImageCount: record.total_image_count || 0,
      finishedImageCount: record.finished_image_count || 0,
      images,
    });
  }

  return histories;
}
