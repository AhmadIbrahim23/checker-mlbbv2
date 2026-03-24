import { NextRequest, NextResponse } from 'next/server';
import { checkAccount, CheckMode } from '@/lib/mlbb-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, captcha, abck, mode = 'ban' } = body;

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        message: 'Email dan password diperlukan',
      });
    }

    if (!captcha) {
      return NextResponse.json({
        success: false,
        message: 'Token CAPTCHA diperlukan',
      });
    }

    if (!abck) {
      return NextResponse.json({
        success: false,
        message: '_abck cookie diperlukan',
      });
    }

    const result = await checkAccount(email, password, captcha, abck, mode as CheckMode);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API] Error:', error.message);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
}