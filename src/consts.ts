/**
 * Dreamina API 常量定义
 * 基于 jimeng-api 项目最新版本
 */

// API 基础 URL - 按照 jimeng-api 的格式
export const BASE_URL_CN = "https://jimeng.jianying.com";
export const BASE_URL_DREAMINA_US = "https://dreamina-api.us.capcut.com";
export const BASE_URL_DREAMINA_HK = "https://mweb-api-sg.capcut.com";  // HK/JP/SG 共用
export const BASE_URL_US_COMMERCE = "https://commerce.us.capcut.com";
export const BASE_URL_HK_COMMERCE = "https://commerce-api-sg.capcut.com";  // HK/JP/SG 共用

// 默认助手 ID - 按区域
export const DEFAULT_ASSISTANT_ID_CN = 513695;
export const DEFAULT_ASSISTANT_ID_US = 513641;
export const DEFAULT_ASSISTANT_ID_HK = 513641;
export const DEFAULT_ASSISTANT_ID_JP = 513641;
export const DEFAULT_ASSISTANT_ID_SG = 513641;

// 地区代码
export const REGION_CN = "cn";
export const REGION_US = "US";
export const REGION_HK = "HK";
export const REGION_JP = "JP";
export const REGION_SG = "SG";

// 平台代码
export const PLATFORM_CODE = "7";

// 版本代码
export const VERSION_CODE = "5.8.0";

// 草稿版本
export const DRAFT_VERSION = "3.3.7";
export const DRAFT_MIN_VERSION = "3.0.2";

// 默认模型
export const DEFAULT_IMAGE_MODEL = "jimeng-4.5";
export const DEFAULT_IMAGE_MODEL_US = "jimeng-4.5";

// 图像模型映射 - 国内站
export const IMAGE_MODEL_MAP: Record<string, string> = {
  "jimeng-4.5": "high_aes_general_v40l",
  "jimeng-4.1": "high_aes_general_v41",
  "jimeng-4.0": "high_aes_general_v40",
  "jimeng-3.1": "high_aes_general_v30l_art_fangzhou:general_v3.0_18b",
  "jimeng-3.0": "high_aes_general_v30l:general_v3.0_18b",
  "jimeng-2.1": "high_aes_general_v21_L:general_v2.1_L",
  "jimeng-2.0-pro": "high_aes_general_v20_L:general_v2.0_L",
  "jimeng-2.0": "high_aes_general_v20:general_v2.0",
  "jimeng-1.4": "high_aes_general_v14:general_v1.4",
  "jimeng-xl-pro": "text2img_xl_sft",
  // 兼容旧名称
  "dreamina-4.5": "high_aes_general_v40l",
  "dreamina-4.1": "high_aes_general_v41",
  "dreamina-4.0": "high_aes_general_v40",
};

// 图像模型映射 - 国际站
export const IMAGE_MODEL_MAP_US: Record<string, string> = {
  "jimeng-4.5": "high_aes_general_v40l",
  "jimeng-4.1": "high_aes_general_v41",
  "jimeng-4.0": "high_aes_general_v40",
  "jimeng-3.0": "high_aes_general_v30l:general_v3.0_18b",
  "nanobanana": "external_model_gemini_flash_image_v25",
  "nanobananapro": "dreamina_image_lib_1",
  // 兼容旧名称
  "dreamina-4.5": "high_aes_general_v40l",
  "dreamina-4.1": "high_aes_general_v41",
  "dreamina-4.0": "high_aes_general_v40",
};

// 状态码映射
export const STATUS_CODE_MAP: Record<number, string> = {
  20: 'PROCESSING',
  10: 'SUCCESS',
  30: 'FAILED',
  42: 'POST_PROCESSING',
  45: 'FINALIZING',
  50: 'COMPLETED'
};

// 重试配置
export const RETRY_CONFIG = {
  MAX_RETRY_COUNT: 3,
  RETRY_DELAY: 5000,
  // 不应该重试的错误码
  NON_RETRYABLE_CODES: [1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015]
};

// 轮询配置
export const POLLING_CONFIG = {
  MAX_POLL_COUNT: 900,
  POLL_INTERVAL: 1000,
  STABLE_ROUNDS: 5,
  TIMEOUT_SECONDS: 900
};

// 分辨率配置 - 按照 jimeng-api 的格式
export const RESOLUTION_OPTIONS: Record<string, Record<string, { width: number; height: number; ratio: number }>> = {
  "1k": {
    "1:1": { width: 1024, height: 1024, ratio: 1 },
    "4:3": { width: 768, height: 1024, ratio: 4 },
    "3:4": { width: 1024, height: 768, ratio: 2 },
    "16:9": { width: 1024, height: 576, ratio: 3 },
    "9:16": { width: 576, height: 1024, ratio: 5 },
    "3:2": { width: 1024, height: 682, ratio: 7 },
    "2:3": { width: 682, height: 1024, ratio: 6 },
    "21:9": { width: 1195, height: 512, ratio: 8 },
  },
  "2k": {
    "1:1": { width: 2048, height: 2048, ratio: 1 },
    "4:3": { width: 2304, height: 1728, ratio: 4 },
    "3:4": { width: 1728, height: 2304, ratio: 2 },
    "16:9": { width: 2560, height: 1440, ratio: 3 },
    "9:16": { width: 1440, height: 2560, ratio: 5 },
    "3:2": { width: 2496, height: 1664, ratio: 7 },
    "2:3": { width: 1664, height: 2496, ratio: 6 },
    "21:9": { width: 3024, height: 1296, ratio: 8 },
  },
  "4k": {
    "1:1": { width: 4096, height: 4096, ratio: 101 },
    "4:3": { width: 4608, height: 3456, ratio: 104 },
    "3:4": { width: 3456, height: 4608, ratio: 102 },
    "16:9": { width: 5120, height: 2880, ratio: 103 },
    "9:16": { width: 2880, height: 5120, ratio: 105 },
    "3:2": { width: 4992, height: 3328, ratio: 107 },
    "2:3": { width: 3328, height: 4992, ratio: 106 },
    "21:9": { width: 6048, height: 2592, ratio: 108 }
  }
};

// 旧版比例映射（兼容）
export const ASPECT_RATIOS = RESOLUTION_OPTIONS["2k"];

// 区域前缀映射
export const REGION_PREFIXES: Record<string, string> = {
  'us-': 'US',
  'hk-': 'HK',
  'jp-': 'JP',
  'sg-': 'SG',
};

// 区域信息接口
export interface RegionInfo {
  isUS: boolean;
  isHK: boolean;
  isJP: boolean;
  isSG: boolean;
  isInternational: boolean;
  isCN: boolean;
  region: string;
  token: string;
}

// 伪装 headers
export const FAKE_HEADERS: Record<string, string> = {
  "Accept": "application/json, text/plain, */*",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "zh-CN,zh;q=0.9",
  "Cache-Control": "no-cache",
  "Content-Type": "application/json",
  "Appvr": VERSION_CODE,
  "Pragma": "no-cache",
  "Priority": "u=1, i",
  "Pf": PLATFORM_CODE,
  "Sec-Ch-Ua": '"Google Chrome";v="142", "Chromium";v="142", "Not_A Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
};
