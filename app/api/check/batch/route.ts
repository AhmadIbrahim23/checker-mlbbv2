import { NextRequest, NextResponse } from 'next/server';
import { checkAccount, CheckMode } from '@/lib/mlbb-api';
import { delay, getRandomDelay } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accounts, captchas, abcks, minDelay = 8, maxDelay = 15, mode = 'ban' } = body;

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Daftar akun diperlukan',
      });
    }

    const results = [];
    const stats = {
      valid: 0,
      invalid: 0,
      banned: 0,
      bind: 0,
      total: accounts.length,
      highestLevel: 0,
    };

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      const [email, password] = account.split(':');

      if (!email || !password) {
        results.push({ email, success: false, message: 'Format tidak valid' });
        stats.invalid++;
        continue;
      }

      const captchaIndex = i % captchas.length;
      const abckIndex = Math.floor(i / 3) % abcks.length;
      const captcha = captchas[captchaIndex];
      const abck = abcks[abckIndex];

      if (!captcha) {
        results.push({ email, success: false, message: 'CAPTCHA tidak tersedia' });
        stats.invalid++;
        continue;
      }

      if (!abck) {
        results.push({ email, success: false, message: '_abck cookie tidak tersedia' });
        stats.invalid++;
        continue;
      }

      try {
        const result = await checkAccount(email, password, captcha, abck, mode as CheckMode);

        if (result.success && result.data) {
          const level = parseInt(result.data.level) || 0;
          if (level > stats.highestLevel) stats.highestLevel = level;

          if (mode === 'bind') {
            stats.bind++;
          } else if (result.data.isBanned) {
            stats.banned++;
          } else {
            stats.valid++;
          }

          results.push({
            email,
            ...result,
            details: result.data,
          });
        } else {
          stats.invalid++;
          results.push({ email, success: false, message: result.message });
        }
      } catch (error: any) {
        stats.invalid++;
        results.push({ email, success: false, message: error.message });
      }

      if (i < accounts.length - 1) {
        const delayTime = getRandomDelay(minDelay, maxDelay);
        await delay(delayTime * 1000);
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      results,
    });
  } catch (error: any) {
    console.error('Batch API error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
}