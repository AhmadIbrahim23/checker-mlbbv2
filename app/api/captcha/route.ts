import { NextResponse } from 'next/server';
import axios from 'axios';

const CAPTCHA_API_URL = 'http://149.104.77.174:1337/token';

export async function GET() {
  try {
    console.log('[CAPTCHA-API] Fetching captcha token...');
    const response = await axios.get(CAPTCHA_API_URL, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('[CAPTCHA-API] Response status:', response.status);
    const data = response.data;

    if (data.success && data.token) {
      console.log('[CAPTCHA-API] Token obtained:', data.token.substring(0, 20) + '...');
      return NextResponse.json({ success: true, token: data.token });
    }

    return NextResponse.json({
      success: false,
      message: data.message || 'Gagal mendapatkan CAPTCHA',
    });
  } catch (error: any) {
    console.error('[CAPTCHA-API] Error:', error.message);
    return NextResponse.json({
      success: false,
      message: error.message || 'Captcha API error',
    });
  }
}