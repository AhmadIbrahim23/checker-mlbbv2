import axios from 'axios';
import { createHash, randomBytes, createHmac } from 'crypto';
import { md5, getRankName, parseBinding, delay } from './utils';
import { MLBB_API } from './constants';

export type CheckMode = 'ban' | 'valid' | 'bind';

export interface AccountData {
  email: string;
  password: string;
  name: string;
  level: string;
  currentRank: string;
  highestRank: string;
  bindings: string;
  bindingsDetail?: Record<string, string>;
  region: string;
  createDate: string;
  roleId: string;
  zoneId: string;
  banStatus: string;
  isBanned: boolean;
  devicesInfo?: string;
}

export interface CheckResult {
  success: boolean;
  message: string;
  data?: AccountData;
}

function makeSign(params: Record<string, any>): string {
  const sorted = Object.keys(params).sort().reduce((acc, key) => {
    acc[key] = params[key];
    return acc;
  }, {} as Record<string, any>);
  const query = Object.entries(sorted).map(([k, v]) => `${k}=${v}`).join('&');
  return md5(`${query}&op=login`);
}

async function getBanInfo(jwt: string): Promise<{ status: string; banned: boolean; reason?: string; until?: string }> {
  try {
    const response = await axios.post(
      'https://api.mobilelegends.com/tools/selfservice/punishList',
      { lang: 'en' },
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json, text/plain, */*',
        },
        timeout: 15000,
      }
    );

    const data = response.data;
    if (data.code === 0 && data.status === 'success') {
      const banData = data.data || [];
      if (banData.length === 0) return { status: 'Tidak Ada', banned: false };
      for (const banInfo of banData) {
        if (banInfo.id) {
          const reason = banInfo.reason || 'Unknown Reason';
          const until = banInfo.unlock_time || 'N/A';
          return {
            status: `Ya (Alasan: ${reason}, Hingga: ${until})`,
            banned: true,
            reason: reason,
            until: until,
          };
        }
      }
    }
    return { status: 'Tidak Ada', banned: false };
  } catch (error) {
    console.error('Ban info error:', error);
    return { status: 'Error API', banned: false };
  }
}

async function getCreationDate(roleId: string, zoneId: string): Promise<string> {
  return 'Tidak diketahui';
}

async function getDevicesInfo(jwt: string): Promise<string> {
  try {
    const response = await axios.post(
      'https://api.mobilelegends.com/tools/device/getDeviceList',
      {},
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      }
    );
    const data = response.data;
    if (data.code === 0 && data.data) {
      const devices = data.data.devices || [];
      const activeCount = devices.filter((d: any) => d.is_active).length;
      const inactiveCount = devices.length - activeCount;
      return `📱 Android: ${activeCount} Active, ${inactiveCount} Inactive\n📱 Total Devices: ${devices.length}`;
    }
    return '📱 Tidak ada data device';
  } catch {
    return '📱 Tidak dapat mengambil data device';
  }
}

function getRandomUserAgent(): string {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

function cleanCookie(cookie: string): string {
  let cleaned = cookie.trim();
  if (cleaned.startsWith('_abck=')) cleaned = cleaned.substring(6);
  cleaned = cleaned.replace(/[\n\r\t]/g, '');
  return cleaned;
}

async function getAccountBasicInfo(jwt: string): Promise<{
  name: string;
  level: string;
  roleId: string;
  zoneId: string;
  region: string;
  currentRankLevel: number;
  highestRankLevel: number;
}> {
  try {
    const response = await axios.post(
      'https://sg-api.mobilelegends.com/base/getBaseInfo',
      {},
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          'User-Agent': getRandomUserAgent(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
      }
    );
    const info = response.data?.data || {};
    return {
      name: info.name || 'Unknown',
      level: String(info.level || 'N/A'),
      roleId: String(info.roleId || 'N/A'),
      zoneId: String(info.zoneId || 'N/A'),
      region: info.reg_country || 'N/A',
      currentRankLevel: info.rank_level || 0,
      highestRankLevel: info.history_rank_level || 0,
    };
  } catch (error) {
    return {
      name: 'Unknown',
      level: 'N/A',
      roleId: 'N/A',
      zoneId: 'N/A',
      region: 'N/A',
      currentRankLevel: 0,
      highestRankLevel: 0,
    };
  }
}

async function getBindingsInfo(jwt: string, roleId: string, zoneId: string): Promise<{
  bindingsText: string;
  bindingsDetail: Record<string, string>;
}> {
  const bindData: any = { data: {} };

  try {
    const res = await axios.post(
      'https://api.mobilelegends.com/tools/deleteaccount/getCancelAccountInfo',
      {},
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          'User-Agent': getRandomUserAgent(),
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    if (res.data?.code === 0 && res.data?.data) {
      Object.assign(bindData.data, res.data.data);
    }
  } catch (e) {}

  if (roleId && roleId !== 'N/A' && zoneId && zoneId !== 'N/A') {
    try {
      const res = await axios.post(
        'https://api.mobilelegends.com/game/binding/list',
        { game_id: 1, role_id: roleId, zone_id: zoneId },
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
            'User-Agent': getRandomUserAgent(),
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
      if (res.data?.code === 0 && res.data?.data) {
        Object.assign(bindData.data, res.data.data);
      }
    } catch (e) {}
  }

  try {
    const res = await axios.post(
      'https://api.mobilelegends.com/user/getBindStatus',
      {},
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          'User-Agent': getRandomUserAgent(),
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    if (res.data?.code === 0 && res.data?.data) {
      Object.assign(bindData.data, res.data.data);
    }
  } catch (e) {}

  try {
    const res = await axios.post(
      'https://sg-api.mobilelegends.com/base/getBaseInfo',
      {},
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          'User-Agent': getRandomUserAgent(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
      }
    );
    if (res.data?.code === 0 && res.data?.data) {
      Object.assign(bindData.data, res.data.data);
    }
  } catch (e) {}

  const bindingsDetail = parseBinding(bindData);
  const connected = Object.entries(bindingsDetail)
    .filter(([, s]) => s.includes('✅') || s.includes('('))
    .map(([p]) => p);
  const bindingsText = connected.length > 0 ? connected.join(' + ') : 'Tidak ada binding';

  return { bindingsText, bindingsDetail };
}

export async function checkAccount(
  email: string,
  password: string,
  captcha: string,
  abckRaw: string,
  mode: CheckMode = 'ban',
  retryCount: number = 0
): Promise<CheckResult> {
  const MAX_RETRIES = 2;

  try {
    const abck = cleanCookie(abckRaw);
    if (!abck || abck.length < 20) {
      return { success: false, message: 'Format _abck cookie tidak valid' };
    }

    const p = md5(password);
    const params = { account: email, md5pwd: p, game_token: '', recaptcha_token: '', e_captcha: captcha, country: '' };
    const payload = { op: 'login', sign: makeSign(params), params: params, lang: 'en' };

    const headers = {
      'User-Agent': getRandomUserAgent(),
      Accept: 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Content-Type': 'application/json',
      Origin: 'https://mtacc.mobilelegends.com',
      Referer: 'https://mtacc.mobilelegends.com/',
      Cookie: `_abck=${abck}`,
    };

    const session = axios.create({ headers, timeout: 30000 });
    
    console.log(`[MLBB-API] Checking: ${email}`);
    
    const response = await session.post(MLBB_API.BASE_URL, payload);
    const js = response.data;
    const code = js.code;
    const message = js.message || 'Unknown error';

    console.log(`[MLBB-API] Response code: ${code}, message: ${message}`);

    if (code !== 0) {
      if (message.includes('ECaptcha')) {
        return { success: false, message: 'Verifikasi CAPTCHA gagal' };
      }
      if (message.includes('password') || message.includes('account')) {
        return { success: false, message: 'Email atau password salah' };
      }
      if (message.includes('Cookie') || message.includes('Access')) {
        if (retryCount < MAX_RETRIES) {
          await delay(5000);
          return checkAccount(email, password, captcha, abckRaw, mode, retryCount + 1);
        }
        return { success: false, message: '_abck cookie tidak valid atau expired' };
      }
      return { success: false, message: `Login gagal: ${message}` };
    }

    const loginData = js.data || {};
    const sessionToken = loginData.session;
    const gui = loginData.guid;
    if (!sessionToken) return { success: false, message: 'Tidak mendapatkan session token' };

    const jwtPayload = { id: gui, token: sessionToken, type: 'mt_And' };
    const jwtResponse = await axios.post(
      'https://api.mobilelegends.com/tools/deleteaccount/getToken',
      jwtPayload,
      {
        headers: { Authorization: sessionToken, 'User-Agent': getRandomUserAgent(), 'Content-Type': 'application/json' },
        timeout: 20000,
      }
    );

    const jwtData = jwtResponse.data;
    if (!jwtData?.data?.jwt) return { success: false, message: 'Gagal mendapatkan JWT token' };

    const jwt = jwtData.data.jwt;
    const basicInfo = await getAccountBasicInfo(jwt);
    const createDate = await getCreationDate(basicInfo.roleId, basicInfo.zoneId);
    const currentRank = getRankName(basicInfo.currentRankLevel);
    const highestRank = getRankName(basicInfo.highestRankLevel);
    const banInfo = await getBanInfo(jwt);

    let bindingsText = 'Tidak ada binding';
    let bindingsDetail: Record<string, string> = {};
    let devicesInfo = '';

    if (mode === 'valid' || mode === 'bind') {
      const bindInfo = await getBindingsInfo(jwt, basicInfo.roleId, basicInfo.zoneId);
      bindingsText = bindInfo.bindingsText;
      bindingsDetail = bindInfo.bindingsDetail;
    }

    if (mode === 'bind') {
      devicesInfo = await getDevicesInfo(jwt);
    }

    const accountData: AccountData = {
      email,
      password,
      name: basicInfo.name,
      level: basicInfo.level,
      currentRank,
      highestRank,
      bindings: bindingsText,
      bindingsDetail: (mode === 'valid' || mode === 'bind') ? bindingsDetail : undefined,
      region: basicInfo.region,
      createDate,
      roleId: basicInfo.roleId,
      zoneId: basicInfo.zoneId,
      banStatus: banInfo.status,
      isBanned: banInfo.banned,
      devicesInfo: mode === 'bind' ? devicesInfo : undefined,
    };

    console.log(`[MLBB-API] Success for ${email}: ${basicInfo.name} (${currentRank})`);

    return {
      success: true,
      message: `Login berhasil!`,
      data: accountData,
    };
  } catch (error: any) {
    console.error('Check account error:', error.message);
    if (error.response?.status === 403 && retryCount < MAX_RETRIES) {
      await delay(10000 * (retryCount + 1));
      return checkAccount(email, password, captcha, abckRaw, mode, retryCount + 1);
    }
    return {
      success: false,
      message: `Request gagal: ${error.message || 'Unknown error'}`,
    };
  }
}