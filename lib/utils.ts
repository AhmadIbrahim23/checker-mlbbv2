import { createHash } from 'crypto';
import { RANK_RANGES, BINDING_MAP } from './constants';

export function md5(text: string): string {
  return createHash('md5').update(text).digest('hex');
}

export function getRankName(rankLevel: number): string {
  try {
    for (const rank of RANK_RANGES) {
      if (rank.min <= rankLevel && rankLevel <= rank.max) {
        if (rank.rank === 'Mythic') {
          const star = rankLevel - 136;
          return `Mythic ${star}⭐`;
        } else if (rank.rank === 'Mythic Honor') {
          const star = rankLevel - 160;
          return `Mythic Honor ${star + 24}⭐`;
        } else if (rank.rank === 'Mythical Glory') {
          const star = rankLevel - 185;
          return `Mythical Glory ${star + 49}⭐`;
        } else if (rank.rank === 'Mythical Immortal') {
          const star = rankLevel - 235;
          return `Mythical Immortal ${star + 99}⭐`;
        }
        return rank.rank;
      }
    }
    return 'Unranked';
  } catch {
    return 'N/A';
  }
}

export function parseBinding(bindJson: any): Record<string, string> {
  try {
    const data = bindJson?.data || {};
    const bindings: Record<string, string> = {};

    // ========== 1. FLAG BINDING ==========
    const flagMapping: Record<string, string> = {
      is_mt_bind: 'Moonton',
      is_fb_bind: 'Facebook',
      is_google_bind: 'Google',
      is_vk_bind: 'VK',
      is_apple_bind: 'Apple',
      is_twitter_bind: 'Twitter',
      is_tiktok_bind: 'TikTok',
      is_line_bind: 'LINE',
      is_discord_bind: 'Discord',
      is_wa_bind: 'WhatsApp',
      is_telegram_bind: 'Telegram',
      is_gamecenter_bind: 'Game Center',
    };

    for (const [flag, platform] of Object.entries(flagMapping)) {
      if (data[flag] === 1 || data[flag] === true) {
        bindings[platform] = '✅ Connected';
      }
    }

    // ========== 2. BIND STATUS OBJECT ==========
    if (data.bind_status && typeof data.bind_status === 'object') {
      const statusMapping: Record<string, string> = {
        mt: 'Moonton',
        fb: 'Facebook',
        google: 'Google',
        vk: 'VK',
        apple: 'Apple',
        twitter: 'Twitter',
        tiktok: 'TikTok',
        line: 'LINE',
        discord: 'Discord',
        wa: 'WhatsApp',
        telegram: 'Telegram',
        gamecenter: 'Game Center',
      };
      for (const [key, platform] of Object.entries(statusMapping)) {
        if (data.bind_status[key] === 1 || data.bind_status[key] === true) {
          if (!bindings[platform]) {
            bindings[platform] = '✅ Connected';
          }
        }
      }
    }

    // ========== 3. BIND_EMAIL ARRAY (YANG PALING PENTING!) ==========
    const emailFields = ['bind_email', 'email', 'emails', 'bound_emails', 'social_emails', 'connected_emails'];
    for (const field of emailFields) {
      let fieldData = data[field];
      
      if (typeof fieldData === 'string') {
        try {
          fieldData = JSON.parse(fieldData);
        } catch (e) {}
      }
      
      if (Array.isArray(fieldData)) {
        for (const item of fieldData) {
          if (typeof item === 'string') {
            const prefixMapping: Record<string, string> = {
              'mt-and_': 'Moonton',
              'mt-ios_': 'Moonton',
              'mt_': 'Moonton',
              'fb-and_': 'Facebook',
              'fb-ios_': 'Facebook',
              'fb_': 'Facebook',
              'gg-and_': 'Google',
              'gg-ios_': 'Google',
              'gg_': 'Google',
              'google-and_': 'Google',
              'vk-and_': 'VK',
              'vk-ios_': 'VK',
              'apple-and_': 'Apple',
              'apple-ios_': 'Apple',
              'twitter-and_': 'Twitter',
              'twitter-ios_': 'Twitter',
              'tiktok-and_': 'TikTok',
              'tiktok-ios_': 'TikTok',
              'line-and_': 'LINE',
              'line-ios_': 'LINE',
              'discord-and_': 'Discord',
              'discord-ios_': 'Discord',
              'wa-and_': 'WhatsApp',
              'wa-ios_': 'WhatsApp',
              'whatsapp-and_': 'WhatsApp',
              'tg-and_': 'Telegram',
              'tg-ios_': 'Telegram',
              'telegram-and_': 'Telegram',
              'gamecenter-ios_': 'Game Center',
            };
            
            for (const [prefix, platform] of Object.entries(prefixMapping)) {
              if (item.toLowerCase() === prefix.toLowerCase() || item.toLowerCase().startsWith(prefix.toLowerCase())) {
                if (!bindings[platform]) {
                  let details = '';
                  if (item.length > prefix.length) {
                    details = item.substring(prefix.length);
                    if (details && details !== 'and_' && details !== 'ios_') {
                      if (details.includes('@')) {
                        const [user, domain] = details.split('@');
                        const userLength = user.length;
                        const maskedUser = userLength > 2
                          ? user[0] + '*'.repeat(userLength - 2) + user[userLength - 1]
                          : user[0] + '*';
                        details = `${maskedUser}@${domain}`;
                      } else if (details.length > 4) {
                        details = details.slice(0, 2) + '****' + details.slice(-2);
                      }
                      bindings[platform] = `(${details})`;
                    } else {
                      bindings[platform] = '✅ Connected';
                    }
                  } else {
                    bindings[platform] = '✅ Connected';
                  }
                }
                break;
              }
            }
          }
        }
      }
    }

    // ========== 4. DIRECT STRING FIELDS ==========
    const directFields: Record<string, string> = {
      facebook: 'Facebook',
      google: 'Google',
      vk: 'VK',
      apple: 'Apple',
      twitter: 'Twitter',
      tiktok: 'TikTok',
      line: 'LINE',
      discord: 'Discord',
      whatsapp: 'WhatsApp',
      telegram: 'Telegram',
      gamecenter: 'Game Center',
      moonton: 'Moonton',
    };

    for (const [field, platform] of Object.entries(directFields)) {
      const value = data[`${field}_bind`] || data[`bind_${field}`] || data[field];
      if (value && value !== 0 && value !== '0' && value !== '') {
        if (!bindings[platform]) {
          if (typeof value === 'string' && value.length > 0 && value !== '1' && value !== 'true') {
            let masked = value;
            if (value.includes('@')) {
              const [user, domain] = value.split('@');
              const userLength = user.length;
              const maskedUser = userLength > 2
                ? user[0] + '*'.repeat(userLength - 2) + user[userLength - 1]
                : user[0] + '*';
              masked = `${maskedUser}@${domain}`;
            } else if (value.length > 4) {
              masked = value.slice(0, 2) + '****' + value.slice(-2);
            }
            bindings[platform] = `(${masked})`;
          } else {
            bindings[platform] = '✅ Connected';
          }
        }
      }
    }

    // ========== 5. SOCIAL ACCOUNTS ==========
    if (data.social_accounts && Array.isArray(data.social_accounts)) {
      const socialMap: Record<string, string> = {
        facebook: 'Facebook',
        google: 'Google',
        vk: 'VK',
        apple: 'Apple',
        twitter: 'Twitter',
        tiktok: 'TikTok',
        line: 'LINE',
        discord: 'Discord',
        whatsapp: 'WhatsApp',
        telegram: 'Telegram',
        gamecenter: 'Game Center',
      };
      for (const account of data.social_accounts) {
        const platformRaw = (account.platform || account.type || '').toLowerCase();
        const accountId = account.account_id || account.id || account.name || account.username || '';
        for (const [key, platform] of Object.entries(socialMap)) {
          if (platformRaw.includes(key) || key.includes(platformRaw)) {
            if (!bindings[platform] && accountId) {
              let masked = accountId;
              if (accountId.includes('@')) {
                const [user, domain] = accountId.split('@');
                const userLength = user.length;
                const maskedUser = userLength > 2
                  ? user[0] + '*'.repeat(userLength - 2) + user[userLength - 1]
                  : user[0] + '*';
                masked = `${maskedUser}@${domain}`;
              } else if (accountId.length > 4) {
                masked = accountId.slice(0, 2) + '****' + accountId.slice(-2);
              }
              bindings[platform] = `(${masked})`;
            }
            break;
          }
        }
      }
    }

    // ========== 6. SET DEFAULT ==========
    const allPlatforms = [
      'Moonton', 'VK', 'Google', 'TikTok', 'Facebook', 'Apple',
      'Game Center', 'Telegram', 'WhatsApp', 'LINE', 'Discord', 'Twitter',
    ];

    for (const platform of allPlatforms) {
      if (!bindings[platform]) {
        bindings[platform] = '❌ Not Connected';
      }
    }

    return bindings;
  } catch (error) {
    console.error('[parseBinding] Error:', error);
    return {};
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getRandomDelay(min: number = 5, max: number = 15): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  const userLength = user.length;
  if (userLength <= 3) {
    return `${user[0]}***@${domain}`;
  }
  return `${user.slice(0, 3)}***@${domain}`;
}

export function maskPassword(password: string): string {
  const passwordLength = password.length;
  if (passwordLength <= 2) return '***';
  return password[0] + '*'.repeat(passwordLength - 2) + password[passwordLength - 1];
}