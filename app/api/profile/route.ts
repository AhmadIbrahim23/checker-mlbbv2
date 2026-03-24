import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// API URLs
const API_PROFILE = "https://bcn.biz.id/api/get-profile";
const API_SKIN = "https://bcn.biz.id/api/get-skin";
const API_STATISTIC = "https://bcn.biz.id/api/get-statistic";

// Enable debug
const DEBUG = true;

function logDebug(...args: any[]) {
  if (DEBUG) {
    console.log('[PROFILE-API]', new Date().toISOString(), ...args);
  }
}

function cleanNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '');
    const num = parseInt(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return value;
}

// Create axios instance with retry strategy (sama seperti Python)
const createAxiosInstance = () => {
  const instance = axios.create({
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'id,en;q=0.9',
      'Connection': 'keep-alive'
    }
  });
  
  // Add retry interceptor
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const { config, response } = error;
      
      // If no config or already retried, reject
      if (!config || !config.retry) {
        config.retry = 0;
      }
      
      // Check if we should retry (status 429, 500, 502, 503, 504)
      const shouldRetry = response?.status && [429, 500, 502, 503, 504].includes(response.status);
      
      if (shouldRetry && config.retry < 3) {
        config.retry += 1;
        const delay = 1500 * config.retry; // backoff factor 1.5
        logDebug(`Retrying ${config.url}, attempt ${config.retry}, waiting ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return instance(config);
      }
      
      return Promise.reject(error);
    }
  );
  
  return instance;
};

const apiClient = createAxiosInstance();

async function fetchAPI(url: string, pid: string, zid: string, apiName: string) {
  try {
    logDebug(`Fetching ${apiName} for PID:${pid}, ZID:${zid}`);
    
    const response = await apiClient.get(url, {
      params: { pid, zid }
    });
    
    logDebug(`${apiName} response status: ${response.status}`);
    
    // Handle response
    if (typeof response.data === 'string') {
      try {
        const parsed = JSON.parse(response.data);
        logDebug(`${apiName} parsed successfully`);
        return parsed;
      } catch (e) {
        logDebug(`${apiName} response is not valid JSON:`, response.data.substring(0, 300));
        return { success: false, message: 'Invalid JSON response', rawData: response.data };
      }
    }
    
    logDebug(`${apiName} response data preview:`, JSON.stringify(response.data).substring(0, 500));
    return response.data;
  } catch (error: any) {
    logDebug(`${apiName} error:`, error.message);
    if (error.response) {
      logDebug(`${apiName} error response status:`, error.response.status);
      logDebug(`${apiName} error response data:`, error.response.data);
    }
    return { success: false, message: error.message };
  }
}

// Function to parse rank with stars
function parseRankWithStars(rankStr: string): string {
  if (!rankStr) return 'Tidak ada';
  
  // Handle Mythic format with stars
  if (rankStr.includes('Mythic') && rankStr.includes('⭐')) {
    return rankStr;
  }
  
  // Check if it contains star emoji
  const starMatch = rankStr.match(/⭐\s*(\d+)/);
  if (starMatch) {
    const stars = starMatch[1];
    const rankName = rankStr.replace(/⭐\s*\d+/, '').trim();
    return `${rankName} ⭐ ${stars}`;
  }
  
  return rankStr;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pid, zid } = body;

    logDebug(`========================================`);
    logDebug(`PROFILE REQUEST: PID=${pid}, ZID=${zid}`);
    logDebug(`========================================`);

    if (!pid || !zid) {
      return NextResponse.json({
        success: false,
        message: 'PID and ZID are required'
      });
    }

    if (!pid.match(/^\d+$/) || !zid.match(/^\d+$/)) {
      return NextResponse.json({
        success: false,
        message: 'PID and ZID must be numbers only'
      });
    }

    // Fetch all data in parallel with retry
    const [profileRes, skinRes, statisticRes] = await Promise.all([
      fetchAPI(API_PROFILE, pid, zid, 'PROFILE'),
      fetchAPI(API_SKIN, pid, zid, 'SKIN'),
      fetchAPI(API_STATISTIC, pid, zid, 'STATISTIC')
    ]);

    // Check profile response
    if (!profileRes.success) {
      logDebug(`Profile API failed: ${profileRes.message}`);
      return NextResponse.json({
        success: false,
        message: profileRes.message || 'Failed to fetch profile data'
      });
    }

    const profileData = profileRes.data || {};
    const skinData = skinRes.success ? skinRes.data : {};
    const statisticData = statisticRes.success ? statisticRes.data : {};

    logDebug(`Profile data keys:`, Object.keys(profileData));
    logDebug(`Skin data keys:`, Object.keys(skinData));
    logDebug(`Statistic data keys:`, Object.keys(statisticData));
    logDebug(`Statistic raw data:`, JSON.stringify(statisticData, null, 2));

    // Parse statistic data
    let parsedStatistic = null;
    
    if (statisticData && Object.keys(statisticData).length > 0) {
      parsedStatistic = {
        totalMatch: cleanNumber(statisticData.totalMatch || 0),
        totalClasicAndRank: cleanNumber(statisticData.totalClasicAndRank || 0),
        winRate: statisticData.winRate || '0%',
        maxWinStreak: statisticData.maxWinStreak || '-',
        getMvp: cleanNumber(statisticData.getMvp || 0),
        getLose: cleanNumber(statisticData.getLose || 0),
        getSavage: cleanNumber(statisticData.getSavage || 0),
        getManiac: cleanNumber(statisticData.getManiac || 0),
        getLegendary: cleanNumber(statisticData.getLegendary || 0),
        getTripleKill: cleanNumber(statisticData.getTripleKill || 0),
        getDoubleKill: cleanNumber(statisticData.getDoubleKill || 0),
        getFirstBlood: cleanNumber(statisticData.getFirstBlood || 0),
        mostKill: cleanNumber(statisticData.mostKill || 0),
        mostAssist: cleanNumber(statisticData.mostAssist || 0),
        highDmg: cleanNumber(statisticData.highDmg || 0),
        dmgTaken: cleanNumber(statisticData.dmgTaken || 0),
        highGold: cleanNumber(statisticData.highGold || 0)
      };
      logDebug(`Statistic data parsed successfully:`, JSON.stringify(parsedStatistic, null, 2));
    } else {
      logDebug(`No statistic data available for this player`);
    }

    // Format rank with stars
    const currentRankFormatted = parseRankWithStars(profileData.currentRank);
    const highestRankFormatted = parseRankWithStars(profileData.highestRank);

    // Build result
    const result = {
      nickname: profileData.nickname || 'Unknown',
      pid: profileData.pid || pid,
      zid: profileData.zid || zid,
      currentRank: currentRankFormatted,
      highestRank: highestRankFormatted,
      celestialLevel: profileData.celestialLevel || '0',
      squadName: profileData.squadName || '-',
      totalMatch: cleanNumber(profileData.totalMatch || 0),
      followers: cleanNumber(profileData.followers || 0),
      likes: cleanNumber(profileData.likes || 0),
      popularity: cleanNumber(profileData.popularity || 0),
      achievement: cleanNumber(profileData.achievement || 0),
      obtainedHero: cleanNumber(profileData.obtainedHero || 0),
      obtainedSkin: cleanNumber(profileData.obtainedSkin || 0),
      collectorLevel: profileData.collectorLevel || '-',
      collectorPoint: cleanNumber(profileData.collectorPoint || 0),
      picture: profileData.picture || null,
      serverTime: profileData.serverTime || new Date().toISOString(),
      
      // Skin Detail (from skin API)
      skinDetail: skinData && Object.keys(skinData).length > 0 ? {
        obtainedSkin: cleanNumber(skinData.obtainedSkin || 0),
        collectorLevel: skinData.collectorLevel || '-',
        collectorPoint: cleanNumber(skinData.collectorPoint || 0),
        legendSkin: cleanNumber(skinData.legendSkin || 0),
        grandSkin: cleanNumber(skinData.grandSkin || 0),
        exquisiteSkin: cleanNumber(skinData.exquisiteSkin || 0),
        deluxeSkin: cleanNumber(skinData.deluxeSkin || 0),
        exeptionalSkin: cleanNumber(skinData.exeptionalSkin || 0),
        commonSkin: cleanNumber(skinData.commonSkin || 0),
        paintedSkin: cleanNumber(skinData.paintedSkin || 0),
        lastObtainedSkin: skinData.lastObtainedSkin || '-',
        lastObtainedHero: skinData.lastObainedHero || '-'
      } : undefined,
      
      // Statistic
      statistic: parsedStatistic
    };

    logDebug(`Final result - Statistic available: ${!!result.statistic}`);
    logDebug(`Final result - Skin detail available: ${!!result.skinDetail}`);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    logDebug('Profile API error:', error.message);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to fetch profile data'
    });
  }
}