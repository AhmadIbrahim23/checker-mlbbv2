export const RANK_RANGES = [
  { min: 0, max: 4, rank: 'Warrior III' },
  { min: 5, max: 9, rank: 'Warrior II' },
  { min: 10, max: 14, rank: 'Warrior I' },
  { min: 15, max: 19, rank: 'Elite IV' },
  { min: 20, max: 24, rank: 'Elite III' },
  { min: 25, max: 29, rank: 'Elite II' },
  { min: 30, max: 34, rank: 'Elite I' },
  { min: 35, max: 39, rank: 'Master IV' },
  { min: 40, max: 44, rank: 'Master III' },
  { min: 45, max: 49, rank: 'Master II' },
  { min: 50, max: 54, rank: 'Master I' },
  { min: 55, max: 59, rank: 'Grandmaster IV' },
  { min: 60, max: 64, rank: 'Grandmaster III' },
  { min: 65, max: 69, rank: 'Grandmaster II' },
  { min: 70, max: 74, rank: 'Grandmaster I' },
  { min: 75, max: 79, rank: 'Epic IV' },
  { min: 80, max: 84, rank: 'Epic III' },
  { min: 85, max: 89, rank: 'Epic II' },
  { min: 90, max: 94, rank: 'Epic I' },
  { min: 95, max: 99, rank: 'Legend IV' },
  { min: 100, max: 104, rank: 'Legend III' },
  { min: 105, max: 109, rank: 'Legend II' },
  { min: 110, max: 114, rank: 'Legend I' },
  { min: 115, max: 136, rank: 'Mythic Entry' },
  { min: 137, max: 160, rank: 'Mythic' },
  { min: 161, max: 185, rank: 'Mythic Honor' },
  { min: 186, max: 235, rank: 'Mythical Glory' },
  { min: 236, max: 9999, rank: 'Mythical Immortal' },
];

export const BINDING_MAP: Record<string, string> = {
  // Moonton
  'mt-and_': 'Moonton',
  'mt-ios_': 'Moonton',
  'mt_': 'Moonton',
  // Facebook
  'fb-and_': 'Facebook',
  'fb-ios_': 'Facebook',
  'fb_': 'Facebook',
  // VK
  'vk-and_': 'VK',
  'vk-ios_': 'VK',
  'vk_': 'VK',
  // Google
  'google-and_': 'Google',
  'google-ios_': 'Google',
  'gg_': 'Google',
  'gg-and_': 'Google',
  'gg-ios_': 'Google',
  // Apple
  'apple-and_': 'Apple',
  'apple-ios_': 'Apple',
  // Twitter
  'twitter-and_': 'Twitter',
  'twitter-ios_': 'Twitter',
  // TikTok
  'tiktok-and_': 'TikTok',
  'tiktok-ios_': 'TikTok',
  // LINE
  'line-and_': 'LINE',
  'line-ios_': 'LINE',
  // Discord
  'discord-and_': 'Discord',
  'discord-ios_': 'Discord',
  // WhatsApp
  'wa-and_': 'WhatsApp',
  'wa-ios_': 'WhatsApp',
  'whatsapp-and_': 'WhatsApp',
  'whatsapp-ios_': 'WhatsApp',
  // Telegram
  'tg-and_': 'Telegram',
  'tg-ios_': 'Telegram',
  'telegram-and_': 'Telegram',
  'telegram-ios_': 'Telegram',
  // Game Center
  'gamecenter-ios_': 'Game Center',
};

export const MLBB_API = {
  BASE_URL: 'https://accountmtapi.mobilelegends.com',
  PROFILE_URL: 'https://api.mobilelegends.com',
  SG_API: 'https://sg-api.mobilelegends.com',
};

export const PLATFORM_ORDER = [
  'Moonton',
  'VK',
  'Google',
  'TikTok',
  'Facebook',
  'Apple',
  'Game Center',
  'Telegram',
  'WhatsApp',
  'LINE',
  'Discord',
  'Twitter',
];