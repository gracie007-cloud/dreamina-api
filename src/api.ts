/**
 * API 请求模块
 * 基于 jimeng-api 项目最新版本
 */

import {
  BASE_URL_CN,
  BASE_URL_DREAMINA_US,
  BASE_URL_DREAMINA_HK,
  BASE_URL_US_COMMERCE,
  BASE_URL_HK_COMMERCE,
  DEFAULT_ASSISTANT_ID_CN,
  DEFAULT_ASSISTANT_ID_US,
  DEFAULT_ASSISTANT_ID_HK,
  DEFAULT_ASSISTANT_ID_JP,
  DEFAULT_ASSISTANT_ID_SG,
  REGION_CN,
  REGION_US,
  REGION_HK,
  REGION_JP,
  REGION_SG,
  PLATFORM_CODE,
  VERSION_CODE,
  FAKE_HEADERS,
  RETRY_CONFIG,
  RegionInfo,
} from './consts';
import { uuid, md5Sync, delay } from './utils';

// 设备ID和WebID - 按照 jimeng-api 格式
const DEVICE_ID = Math.random() * 999999999999999999 + 7000000000000000000;
const WEB_ID = Math.random() * 999999999999999999 + 7000000000000000000;
const USER_ID = uuid().replace(/-/g, '');

/**
 * 解析 token 中的地区信息
 */
export function parseRegionFromToken(refreshToken: string): RegionInfo {
  const token = refreshToken.toLowerCase();
  const isUS = token.startsWith('us-');
  const isHK = token.startsWith('hk-');
  const isJP = token.startsWith('jp-');
  const isSG = token.startsWith('sg-');
  const isInternational = isUS || isHK || isJP || isSG;

  // 获取实际的 token（去掉区域前缀）
  const actualToken = isInternational ? refreshToken.substring(3) : refreshToken;

  let region = REGION_CN;
  if (isUS) region = REGION_US;
  else if (isHK) region = REGION_HK;
  else if (isJP) region = REGION_JP;
  else if (isSG) region = REGION_SG;

  return {
    isUS,
    isHK,
    isJP,
    isSG,
    isInternational,
    isCN: !isInternational,
    region,
    token: actualToken,
  };
}

/**
 * 获取助手ID
 */
export function getAssistantId(regionInfo: RegionInfo): number {
  if (regionInfo.isUS) return DEFAULT_ASSISTANT_ID_US;
  if (regionInfo.isJP) return DEFAULT_ASSISTANT_ID_JP;
  if (regionInfo.isSG) return DEFAULT_ASSISTANT_ID_SG;
  if (regionInfo.isHK) return DEFAULT_ASSISTANT_ID_HK;
  return DEFAULT_ASSISTANT_ID_CN;
}

/**
 * 获取 Unix 时间戳
 */
function unixTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * 生成 cookie - 按照 jimeng-api 格式
 */
function generateCookie(regionInfo: RegionInfo): string {
  const { token, isUS, isHK, isJP, isSG } = regionInfo;

  let storeRegion = 'cn-gd';
  if (isUS) storeRegion = 'us';
  else if (isHK) storeRegion = 'hk';
  else if (isJP) storeRegion = 'hk';  // JP uses HK store region
  else if (isSG) storeRegion = 'hk';  // SG uses HK store region

  return [
    `_tea_web_id=${WEB_ID}`,
    `is_staff_user=false`,
    `store-region=${storeRegion}`,
    `store-region-src=uid`,
    `sid_guard=${token}%7C${unixTimestamp()}%7C5184000%7CMon%2C+03-Feb-2025+08%3A17%3A09+GMT`,
    `uid_tt=${USER_ID}`,
    `uid_tt_ss=${USER_ID}`,
    `sid_tt=${token}`,
    `sessionid=${token}`,
    `sessionid_ss=${token}`,
  ].join("; ");
}

/**
 * 获取 Referer
 */
function getRefererByRegion(regionInfo: RegionInfo): string {
  return regionInfo.isInternational
    ? "https://dreamina.capcut.com/"
    : "https://jimeng.jianying.com/ai-tool/image/generate";
}

/**
 * API 错误类
 */
export class DreaminaAPIError extends Error {
  code: number;
  retryable: boolean;
  
  constructor(code: number, message: string, retryable: boolean = true) {
    super(message);
    this.code = code;
    this.name = 'DreaminaAPIError';
    this.retryable = retryable;
  }
}

// 不应重试的错误码
const NON_RETRYABLE_ERROR_CODES = [1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 4001, 5000];

/**
 * 发送请求 - 按照 jimeng-api 格式
 */
export async function request(
  method: string,
  uri: string,
  refreshToken: string,
  options: {
    params?: Record<string, any>;
    data?: any;
    headers?: Record<string, string>;
    noDefaultParams?: boolean;
  } = {}
): Promise<any> {
  const regionInfo = parseRegionFromToken(refreshToken);
  const { isUS, isHK, isJP, isSG } = regionInfo;
  
  const deviceTime = unixTimestamp();
  const sign = md5Sync(`9e2c|${uri.slice(-7)}|${PLATFORM_CODE}|${VERSION_CODE}|${deviceTime}||11ac`);

  // 确定基础 URL 和助手 ID - 按照 jimeng-api 的逻辑
  let baseUrl: string;
  let aid: number;
  let region: string;

  if (isUS) {
    baseUrl = uri.startsWith("/commerce/") ? BASE_URL_US_COMMERCE : BASE_URL_DREAMINA_US;
    aid = DEFAULT_ASSISTANT_ID_US;
    region = REGION_US;
  } else if (isHK || isJP || isSG) {
    // HK, JP, SG 共用新加坡的 API (mweb-api-sg.capcut.com)
    baseUrl = uri.startsWith("/commerce/") ? BASE_URL_HK_COMMERCE : BASE_URL_DREAMINA_HK;
    if (isJP) {
      aid = DEFAULT_ASSISTANT_ID_JP;
      region = REGION_JP;
    } else if (isSG) {
      aid = DEFAULT_ASSISTANT_ID_SG;
      region = REGION_SG;
    } else {
      aid = DEFAULT_ASSISTANT_ID_HK;
      region = REGION_HK;
    }
  } else {
    baseUrl = BASE_URL_CN;
    aid = DEFAULT_ASSISTANT_ID_CN;
    region = REGION_CN;
  }

  const origin = new URL(baseUrl).origin;

  // 构建请求参数 - 按照 jimeng-api 格式
  const requestParams = options.noDefaultParams ? (options.params || {}) : {
    aid: aid,
    device_platform: "web",
    region: region,
    ...(regionInfo.isInternational ? {} : { webId: WEB_ID }),
    da_version: "3.3.2",
    web_component_open_flag: 1,
    web_version: "7.5.0",
    aigc_features: "app_lip_sync",
    ...(options.params || {}),
  };

  // 构建 URL
  const urlWithParams = new URL(`${baseUrl}${uri}`);
  Object.entries(requestParams).forEach(([key, value]) => {
    urlWithParams.searchParams.set(key, String(value));
  });

  // 构建请求头 - 按照 jimeng-api 格式
  const headers: Record<string, string> = {
    ...FAKE_HEADERS,
    Origin: origin,
    Referer: getRefererByRegion(regionInfo),
    Appid: String(aid),
    Cookie: generateCookie(regionInfo),
    "Device-Time": String(deviceTime),
    Sign: sign,
    "Sign-Ver": "1",
    ...(options.headers || {}),
  };

  console.log(`发送请求: ${method.toUpperCase()} ${urlWithParams.toString()}`);
  console.log(`区域: ${regionInfo.region}, Token: ${regionInfo.token.substring(0, 10)}...`);
  if (options.data) {
    console.log(`请求数据: ${JSON.stringify(options.data).substring(0, 800)}...`);
  }

  // 重试逻辑
  let retries = 0;
  const maxRetries = RETRY_CONFIG.MAX_RETRY_COUNT;
  let lastError: Error | null = null;

  while (retries <= maxRetries) {
    try {
      if (retries > 0) {
        console.log(`第 ${retries} 次重试请求: ${method.toUpperCase()} ${uri}`);
        await delay(RETRY_CONFIG.RETRY_DELAY);
      }

      const response = await fetch(urlWithParams.toString(), {
        method: method.toUpperCase(),
        headers,
        body: options.data ? JSON.stringify(options.data) : undefined,
      });

      console.log(`响应状态: ${response.status} ${response.statusText}`);

      const result = await response.json() as any;
      
      console.log(`响应数据摘要: ${JSON.stringify(result).substring(0, 500)}...`);

      // 检查响应
      const ret = result.ret || result.code || 0;
      const errmsg = result.errmsg || result.message || '';

      if (ret !== 0 && ret !== "0") {
        const errorCode = parseInt(String(ret), 10);
        const retryable = !NON_RETRYABLE_ERROR_CODES.includes(errorCode);
        
        // 特殊错误处理
        let friendlyMessage = errmsg;
        switch (errorCode) {
          case 1006:
            friendlyMessage = `积分不足: ${errmsg}。请登录 Dreamina 网站充值或领取免费积分。`;
            break;
          case 1015:
            friendlyMessage = `登录已失效: ${errmsg}。请重新获取 Session ID。`;
            break;
          case 1000:
            friendlyMessage = `参数错误: ${errmsg}。请检查 Session ID 是否正确添加了区域前缀。`;
            break;
        }
        
        throw new DreaminaAPIError(errorCode, `API错误 [${ret}]: ${friendlyMessage}`, retryable);
      }

      return result.data || result;
    } catch (error: any) {
      lastError = error;
      
      // 如果是不可重试的错误，直接抛出
      if (error instanceof DreaminaAPIError && !error.retryable) {
        throw error;
      }
      
      console.error(`请求失败 (尝试 ${retries + 1}/${maxRetries + 1}): ${error.message}`);
      retries++;
      
      if (retries > maxRetries) {
        break;
      }
    }
  }

  throw lastError || new Error('请求失败');
}

/**
 * 获取积分信息
 */
export async function getCredit(refreshToken: string): Promise<{
  giftCredit: number;
  purchaseCredit: number;
  vipCredit: number;
  totalCredit: number;
}> {
  try {
    const result = await request("POST", "/commerce/v1/benefits/user_credit", refreshToken, {
      data: {},
      noDefaultParams: true,
    });

    const credit = result.credit || {};
    const giftCredit = credit.gift_credit || 0;
    const purchaseCredit = credit.purchase_credit || 0;
    const vipCredit = credit.vip_credit || 0;
    const totalCredit = giftCredit + purchaseCredit + vipCredit;

    console.log(`积分信息: 赠送=${giftCredit}, 购买=${purchaseCredit}, VIP=${vipCredit}, 总计=${totalCredit}`);

    return { giftCredit, purchaseCredit, vipCredit, totalCredit };
  } catch (error: any) {
    console.warn(`获取积分失败: ${error.message}，跳过积分检查`);
    // 返回一个大值，让流程继续
    return { giftCredit: 999, purchaseCredit: 0, vipCredit: 0, totalCredit: 999 };
  }
}

/**
 * 接收今日积分
 */
export async function receiveCredit(refreshToken: string): Promise<number> {
  console.log("正在尝试收取今日积分...");
  
  try {
    const result = await request("POST", "/commerce/v1/benefits/credit_receive", refreshToken, {
      data: {
        time_zone: "Asia/Shanghai"
      },
    });

    const receiveQuota = result.receive_quota || 0;
    console.log(`今日 ${receiveQuota} 积分收取成功`);
    return receiveQuota;
  } catch (error: any) {
    console.warn(`领取积分失败: ${error.message}`);
    return 0;
  }
}
