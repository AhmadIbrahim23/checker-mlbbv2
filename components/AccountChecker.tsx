'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import StatsCard from './StatsCard';
import ResultTable from './ResultTable';
import { Download, History, Trash2, X } from 'lucide-react';

interface Stats {
  valid: number;
  invalid: number;
  banned: number;
  bind: number;
  total: number;
  highestLevel: number;
}

interface AccountResult {
  email: string;
  success: boolean;
  message: string;
  timestamp?: string;
  details?: {
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
  };
}

type CheckMode = 'ban' | 'valid' | 'bind';
type CaptchaMode = 'auto' | 'manual' | 'file';

interface HistoryItem {
  id: string;
  timestamp: string;
  mode: CheckMode;
  results: AccountResult[];
  stats: Stats;
}

export default function AccountChecker() {
  const [accounts, setAccounts] = useState('');
  const [abckInput, setAbckInput] = useState('');
  const [abckMode, setAbckMode] = useState<'manual' | 'file'>('file');
  const [abckList, setAbckList] = useState<string[]>([]);
  const [abckFileName, setAbckFileName] = useState('');
  const [abckError, setAbckError] = useState('');
  
  const [captchaMode, setCaptchaMode] = useState<CaptchaMode>('auto');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaList, setCaptchaList] = useState<string[]>([]);
  const [captchaFileName, setCaptchaFileName] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  
  const [minDelay, setMinDelay] = useState(8);
  const [maxDelay, setMaxDelay] = useState(15);
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentAccount, setCurrentAccount] = useState('');
  const [results, setResults] = useState<AccountResult[]>([]);
  const [stats, setStats] = useState<Stats>({ valid: 0, invalid: 0, banned: 0, bind: 0, total: 0, highestLevel: 0 });
  const [checkMode, setCheckMode] = useState<CheckMode>('ban');
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const abckFileInputRef = useRef<HTMLInputElement>(null);
  const captchaFileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('mlbb_checker_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {}
    }
  }, []);

  // Auto-save to history when results change and checking is done
  useEffect(() => {
    if (results.length > 0 && !isChecking) {
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('id-ID'),
        mode: checkMode,
        results: [...results],
        stats: { ...stats }
      };
      
      setHistory(prev => {
        const updated = [newHistoryItem, ...prev].slice(0, 20);
        localStorage.setItem('mlbb_checker_history', JSON.stringify(updated));
        return updated;
      });
    }
  }, [results, isChecking]);

  const clearHistory = () => {
    setHistory([]);
    localStorage.setItem('mlbb_checker_history', '[]');
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('mlbb_checker_history', JSON.stringify(updated));
      return updated;
    });
  };

  const exportHistoryItem = (item: HistoryItem) => {
    const content = item.results.map(r => {
      if (r.success && r.details) {
        let line = `${r.email} | Nama: ${r.details.name} | ID: ${r.details.roleId} (${r.details.zoneId}) | Level: ${r.details.level} | Rank: ${r.details.currentRank} | Region: ${r.details.region} | Bind: ${r.details.bindings} | Ban: ${r.details.banStatus}`;
        if (item.mode === 'bind' && r.details.bindingsDetail) {
          const bindDetails = Object.entries(r.details.bindingsDetail).map(([p, s]) => `${p}: ${s}`).join(' | ');
          line += ` | Binding Detail: ${bindDetails}`;
        }
        if (item.mode === 'bind' && r.details.devicesInfo) {
          line += ` | Devices: ${r.details.devicesInfo}`;
        }
        return line;
      }
      return `${r.email} | ${r.message}`;
    }).join('\n');
    
    const header = `=== HASIL CEK MLBB ===\nMode: ${item.mode === 'ban' ? 'CEK BAN' : item.mode === 'valid' ? 'CEK VALID' : 'CEK BIND'}\nWaktu: ${item.timestamp}\nValid: ${item.stats.valid} | Banned: ${item.stats.banned} | Bind: ${item.stats.bind} | Invalid: ${item.stats.invalid}\n\n`;
    const blob = new Blob([header + content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mlbb_check_${item.timestamp.replace(/[/:]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchCaptcha = async (): Promise<string | null> => {
    try {
      const response = await axios.get('/api/captcha');
      if (response.data.success) return response.data.token;
      return null;
    } catch (error) {
      return null;
    }
  };

  const validateCookie = (cookie: string): boolean => {
    const cleaned = cookie.trim();
    if (!cleaned) return false;
    let value = cleaned;
    if (cleaned.startsWith('_abck=')) value = cleaned.substring(6);
    return value.length >= 20;
  };

  const validateCaptcha = (captcha: string): boolean => {
    return captcha.trim().length >= 10;
  };

  const handleAbckFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAbckFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n').map((line) => line.trim()).filter((line) => line && line.length > 0);
      const validCookies: string[] = [];
      for (const line of lines) if (validateCookie(line)) validCookies.push(line);
      if (validCookies.length === 0) {
        setAbckError(`Tidak ada _abck cookie valid. Ditemukan ${lines.length} baris.`);
        setAbckList([]);
      } else {
        setAbckError('');
        setAbckList(validCookies);
        setAbckInput(`Loaded ${validCookies.length} cookies`);
      }
    };
    reader.onerror = () => setAbckError('Error reading file');
    reader.readAsText(file);
  };

  const handleCaptchaFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCaptchaFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n').map((line) => line.trim()).filter((line) => line && line.length > 0);
      const validCaptchas: string[] = [];
      for (const line of lines) if (validateCaptcha(line)) validCaptchas.push(line);
      if (validCaptchas.length === 0) {
        setCaptchaError(`Tidak ada CAPTCHA valid. Ditemukan ${lines.length} baris.`);
        setCaptchaList([]);
      } else {
        setCaptchaError('');
        setCaptchaList(validCaptchas);
        setCaptchaInput(`Loaded ${validCaptchas.length} CAPTCHAs`);
      }
    };
    reader.onerror = () => setCaptchaError('Error reading file');
    reader.readAsText(file);
  };

  const checkSingleAccount = async (email: string, password: string, captcha: string, abck: string): Promise<AccountResult> => {
    try {
      const response = await axios.post('/api/check', { email, password, captcha, abck, mode: checkMode });
      return {
        email,
        success: response.data.success,
        message: response.data.message,
        timestamp: new Date().toLocaleString(),
        details: response.data.data,
      };
    } catch (error: any) {
      return {
        email,
        success: false,
        message: error.response?.data?.message || error.message || 'Request failed',
        timestamp: new Date().toLocaleString(),
      };
    }
  };

  const startChecking = async () => {
    if (!accounts.trim()) {
      alert('Masukkan akun terlebih dahulu');
      return;
    }

    let abckCookies: string[] = [];
    setAbckError('');
    if (abckMode === 'manual') {
      abckCookies = abckInput.split('\n').map((l) => l.trim()).filter((l) => l);
      if (abckCookies.length === 0) {
        alert('Masukkan _abck cookies');
        return;
      }
    } else {
      if (abckList.length === 0) {
        alert('Upload file abck.txt terlebih dahulu');
        return;
      }
      abckCookies = abckList;
    }

    let captchas: string[] = [];
    setCaptchaError('');
    if (captchaMode === 'manual') {
      captchas = captchaInput.split('\n').map((l) => l.trim()).filter((l) => l);
      if (captchas.length === 0) {
        alert('Masukkan CAPTCHA tokens');
        return;
      }
    } else if (captchaMode === 'file') {
      if (captchaList.length === 0) {
        alert('Upload file captcha.txt terlebih dahulu');
        return;
      }
      captchas = captchaList;
    }

    const accountList = accounts.split('\n').filter((line) => line.includes(':'));
    if (accountList.length === 0) {
      alert('Tidak ada akun valid (format: email:password)');
      return;
    }

    setIsChecking(true);
    setResults([]);
    setStats({ valid: 0, invalid: 0, banned: 0, bind: 0, total: accountList.length, highestLevel: 0 });
    setProgress(0);
    abortControllerRef.current = new AbortController();

    const newResults: AccountResult[] = [];
    const newStats = { valid: 0, invalid: 0, banned: 0, bind: 0, total: accountList.length, highestLevel: 0 };
    
    let autoCaptchas: string[] = [];
    if (captchaMode === 'auto') {
      for (let i = 0; i < Math.min(accountList.length, 5); i++) {
        const captcha = await fetchCaptcha();
        if (captcha) autoCaptchas.push(captcha);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    for (let i = 0; i < accountList.length; i++) {
      if (abortControllerRef.current?.signal.aborted) break;
      
      const [email, password] = accountList[i].split(':', 2);
      if (!email || !password) {
        newResults.push({ email: accountList[i], success: false, message: 'Format tidak valid', timestamp: new Date().toLocaleString() });
        newStats.invalid++;
        setResults([...newResults]);
        setStats({ ...newStats });
        setProgress(Math.floor(((i + 1) / accountList.length) * 100));
        continue;
      }
      
      setCurrentAccount(email);
      
      let captcha: string | null = null;
      if (captchaMode === 'auto') {
        if (i < autoCaptchas.length) {
          captcha = autoCaptchas[i];
        } else {
          captcha = await fetchCaptcha();
        }
        if (!captcha) {
          const userCaptcha = prompt(`Masukkan token captcha untuk ${email}:`);
          if (!userCaptcha) {
            newResults.push({ email, success: false, message: 'Tidak ada captcha', timestamp: new Date().toLocaleString() });
            newStats.invalid++;
            setResults([...newResults]);
            setStats({ ...newStats });
            setProgress(Math.floor(((i + 1) / accountList.length) * 100));
            continue;
          }
          captcha = userCaptcha;
        }
      } else if (captchaMode === 'manual') {
        const idx = i % captchas.length;
        captcha = captchas[idx];
        if (!captcha) {
          newResults.push({ email, success: false, message: 'Tidak ada captcha', timestamp: new Date().toLocaleString() });
          newStats.invalid++;
          setResults([...newResults]);
          setStats({ ...newStats });
          setProgress(Math.floor(((i + 1) / accountList.length) * 100));
          continue;
        }
      } else {
        const idx = i % captchas.length;
        captcha = captchas[idx];
        if (!captcha) {
          newResults.push({ email, success: false, message: 'Tidak ada captcha', timestamp: new Date().toLocaleString() });
          newStats.invalid++;
          setResults([...newResults]);
          setStats({ ...newStats });
          setProgress(Math.floor(((i + 1) / accountList.length) * 100));
          continue;
        }
      }
      
      const abckIndex = Math.floor(i / 3) % abckCookies.length;
      const abck = abckCookies[abckIndex];
      
      const result = await checkSingleAccount(email, password, captcha, abck);
      newResults.push(result);
      
      if (result.success && result.details) {
        const level = parseInt(result.details.level) || 0;
        if (level > newStats.highestLevel) newStats.highestLevel = level;
        if (checkMode === 'bind') newStats.bind++;
        else if (result.details.isBanned) newStats.banned++;
        else newStats.valid++;
      } else {
        newStats.invalid++;
      }
      
      setResults([...newResults]);
      setStats({ ...newStats });
      setProgress(Math.floor(((i + 1) / accountList.length) * 100));
      
      if (i < accountList.length - 1) {
        const delayTime = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        for (let t = delayTime; t > 0; t--) {
          if (abortControllerRef.current?.signal.aborted) break;
          setCurrentAccount(`${email} (menunggu ${t}s...)`);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
    
    setIsChecking(false);
    setCurrentAccount('');
    abortControllerRef.current = null;
    
    // Final update
    setResults([...newResults]);
    setStats({ ...newStats });
    
    // Reset form
    setAccounts('');
    setAbckInput('');
    setAbckList([]);
    setAbckFileName('');
    setCaptchaInput('');
    setCaptchaList([]);
    setCaptchaFileName('');
    setProgress(0);
  };

  const stopChecking = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsChecking(false);
      setCurrentAccount('');
    }
  };

  const getModeTitle = () => {
    switch (checkMode) {
      case 'ban': return '🚫 CEK BAN';
      case 'valid': return '✅ CEK VALID';
      case 'bind': return '🔗 CEK BIND';
      default: return 'CEK AKUN';
    }
  };

  const getModeDescription = () => {
    switch (checkMode) {
      case 'ban': return 'Cek status banned akun MLBB';
      case 'valid': return 'Info lengkap (nama, rank, level, region, binding) + STATUS BANNED';
      case 'bind': return 'Detail binding ke semua platform + info device + STATUS BANNED';
      default: return '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <div className="text-center mb-8">
        <div className="flex justify-end mb-4">
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition">
            <History className="w-5 h-5 text-cyan-400" />
            <span className="text-gray-300">History ({history.length})</span>
          </button>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-2">MLBB Account Checker</h1>
        <p className="text-gray-400">Cek Ban, Valid, dan Bind akun Mobile Legends</p>
        <p className="text-gray-500 text-sm mt-1">Created by @Bokir</p>
      </div>

      {showHistory && (
        <div className="glass-card p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2"><History className="w-5 h-5" /> Riwayat Pengecekan</h2>
            <div className="flex gap-2">
              <button onClick={clearHistory} className="text-red-400 text-sm hover:text-red-300 flex items-center gap-1"><Trash2 className="w-4 h-4" /> Hapus Semua</button>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
          </div>
          {history.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Belum ada riwayat pengecekan</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {history.map((item) => (
                <div key={item.id} className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-xs ${item.mode === 'ban' ? 'bg-red-500/20 text-red-400' : item.mode === 'valid' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'}`}>
                          {item.mode === 'ban' ? 'BAN' : item.mode === 'valid' ? 'VALID' : 'BIND'}
                        </span>
                        <span className="text-xs text-gray-500">{item.timestamp}</span>
                        <span className="text-xs text-green-400">✓ {item.stats.valid}</span>
                        <span className="text-xs text-yellow-400">⚠ {item.stats.banned}</span>
                        {item.mode === 'bind' && <span className="text-xs text-purple-400">🔗 {item.stats.bind}</span>}
                        <span className="text-xs text-red-400">✗ {item.stats.invalid}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1 truncate">
                        {item.results.slice(0, 3).map(r => r.email).join(', ')}
                        {item.results.length > 3 && ` ... +${item.results.length - 3} lainnya`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => exportHistoryItem(item)} className="p-1 text-cyan-400 hover:text-cyan-300" title="Download hasil"><Download className="w-4 h-4" /></button>
                      <button onClick={() => deleteHistoryItem(item.id)} className="p-1 text-red-400 hover:text-red-300" title="Hapus"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="glass-card p-6 mb-6">
        <div className="mb-6 pb-4 border-b border-white/10">
          <label className="block text-gray-300 mb-3">🔍 Pilih Mode Pengecekan</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button onClick={() => setCheckMode('ban')} className={`py-3 px-4 rounded-lg transition ${checkMode === 'ban' ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`} disabled={isChecking}>
              <div className="flex items-center justify-center gap-2"><span className="text-xl">🚫</span><div><div className="font-bold">CEK BAN</div><div className="text-xs opacity-80">Cek status banned</div></div></div>
            </button>
            <button onClick={() => setCheckMode('valid')} className={`py-3 px-4 rounded-lg transition ${checkMode === 'valid' ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`} disabled={isChecking}>
              <div className="flex items-center justify-center gap-2"><span className="text-xl">✅</span><div><div className="font-bold">CEK VALID</div><div className="text-xs opacity-80">Info lengkap + Ban</div></div></div>
            </button>
            <button onClick={() => setCheckMode('bind')} className={`py-3 px-4 rounded-lg transition ${checkMode === 'bind' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`} disabled={isChecking}>
              <div className="flex items-center justify-center gap-2"><span className="text-xl">🔗</span><div><div className="font-bold">CEK BIND</div><div className="text-xs opacity-80">Binding + Device</div></div></div>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">{getModeDescription()}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-4">
          <div>
            <label className="block text-gray-300 mb-2">Akun (email:password)</label>
            <textarea className="w-full h-40 bg-black/30 border border-white/20 rounded-lg p-3 text-sm font-mono text-gray-200 focus:outline-none focus:border-cyan-500" placeholder="email1@gmail.com:password1&#10;email2@gmail.com:password2" value={accounts} onChange={(e) => setAccounts(e.target.value)} disabled={isChecking} />
          </div>
          <div>
            <label className="block text-gray-300 mb-2">_abck Cookies</label>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setAbckMode('manual')} className={`px-3 py-1 rounded-lg text-sm transition ${abckMode === 'manual' ? 'bg-cyan-500 text-white' : 'bg-white/10 hover:bg-white/20'}`} disabled={isChecking}>Manual Input</button>
              <button onClick={() => setAbckMode('file')} className={`px-3 py-1 rounded-lg text-sm transition ${abckMode === 'file' ? 'bg-cyan-500 text-white' : 'bg-white/10 hover:bg-white/20'}`} disabled={isChecking}>Upload abck.txt</button>
            </div>
            {abckMode === 'manual' ? (
              <textarea className="w-full h-32 bg-black/30 border border-white/20 rounded-lg p-3 text-sm font-mono text-gray-200 focus:outline-none focus:border-cyan-500" placeholder="_abck cookie (tanpa _abck=)&#10;03AFcWeA7k9xQ..." value={abckInput} onChange={(e) => setAbckInput(e.target.value)} disabled={isChecking} />
            ) : (
              <div className="border border-white/20 rounded-lg p-4 bg-black/30">
                <input type="file" ref={abckFileInputRef} onChange={handleAbckFileUpload} accept=".txt" className="hidden" disabled={isChecking} />
                <button onClick={() => abckFileInputRef.current?.click()} className="btn-outline w-full py-2 text-sm" disabled={isChecking}>📁 Pilih file abck.txt</button>
                {abckFileName && <p className="text-gray-400 text-xs mt-2">File: {abckFileName}</p>}
                {abckList.length > 0 && <p className="text-green-400 text-xs mt-2">✓ Loaded {abckList.length} _abck cookies</p>}
                {abckError && <p className="text-red-400 text-xs mt-2">{abckError}</p>}
              </div>
            )}
            <p className="text-xs text-yellow-400 mt-1">Tips: Gunakan minimal 3 _abck cookies yang fresh</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 mb-2">🔐 CAPTCHA Tokens</label>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setCaptchaMode('auto')} className={`px-3 py-1 rounded-lg text-sm transition ${captchaMode === 'auto' ? 'bg-cyan-500 text-white' : 'bg-white/10 hover:bg-white/20'}`} disabled={isChecking}>🤖 Auto (API)</button>
            <button onClick={() => setCaptchaMode('manual')} className={`px-3 py-1 rounded-lg text-sm transition ${captchaMode === 'manual' ? 'bg-cyan-500 text-white' : 'bg-white/10 hover:bg-white/20'}`} disabled={isChecking}>📝 Manual Input</button>
            <button onClick={() => setCaptchaMode('file')} className={`px-3 py-1 rounded-lg text-sm transition ${captchaMode === 'file' ? 'bg-cyan-500 text-white' : 'bg-white/10 hover:bg-white/20'}`} disabled={isChecking}>📄 Upload captcha.txt</button>
          </div>
          {captchaMode === 'manual' ? (
            <textarea className="w-full h-32 bg-black/30 border border-white/20 rounded-lg p-3 text-sm font-mono text-gray-200 focus:outline-none focus:border-cyan-500" placeholder="CAPTCHA token 1&#10;CAPTCHA token 2&#10;..." value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value)} disabled={isChecking} />
          ) : captchaMode === 'file' ? (
            <div className="border border-white/20 rounded-lg p-4 bg-black/30">
              <input type="file" ref={captchaFileInputRef} onChange={handleCaptchaFileUpload} accept=".txt" className="hidden" disabled={isChecking} />
              <button onClick={() => captchaFileInputRef.current?.click()} className="btn-outline w-full py-2 text-sm" disabled={isChecking}>📁 Pilih file captcha.txt</button>
              {captchaFileName && <p className="text-gray-400 text-xs mt-2">File: {captchaFileName}</p>}
              {captchaList.length > 0 && <p className="text-green-400 text-xs mt-2">✓ Loaded {captchaList.length} CAPTCHA tokens</p>}
              {captchaError && <p className="text-red-400 text-xs mt-2">{captchaError}</p>}
            </div>
          ) : (
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
              <p className="text-cyan-400 text-sm">🤖 Mode Auto (API)</p>
              <p className="text-gray-400 text-xs mt-1">Bot akan mengambil CAPTCHA token dari API secara otomatis</p>
            </div>
          )}
          <p className="text-xs text-yellow-400 mt-1">
            {captchaMode === 'auto' ? 'API: http://149.104.77.174:1337/token' : 
             captchaMode === 'manual' ? 'Masukkan token CAPTCHA manual (satu per baris)' : 
             'Upload file captcha.txt dengan satu token per baris'}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div><label className="block text-gray-300 mb-2">Min Delay (detik)</label><input type="number" className="w-full bg-black/30 border border-white/20 rounded-lg p-2 text-gray-200" value={minDelay} onChange={(e) => setMinDelay(Math.max(5, parseInt(e.target.value) || 8))} disabled={isChecking} min={5} /><p className="text-xs text-yellow-400">Rekomendasi: 8-15 detik</p></div>
          <div><label className="block text-gray-300 mb-2">Max Delay (detik)</label><input type="number" className="w-full bg-black/30 border border-white/20 rounded-lg p-2 text-gray-200" value={maxDelay} onChange={(e) => setMaxDelay(Math.max(minDelay, parseInt(e.target.value) || 15))} disabled={isChecking} min={minDelay} /></div>
          <div><label className="block text-gray-300 mb-2">&nbsp;</label><div className="text-gray-400 text-sm">Delay acak antara min-max</div></div>
        </div>

        <div className="mt-6 flex gap-3">
          <button className={`btn-primary flex-1 ${isChecking ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={startChecking} disabled={isChecking}>
            {isChecking ? `Memeriksa: ${currentAccount}` : `🚀 Mulai ${getModeTitle()}`}
          </button>
          {isChecking && <button className="btn-outline flex-1" onClick={stopChecking}>Stop</button>}
        </div>

        {isChecking && (
          <div className="mt-4">
            <div className="bg-gray-700 rounded-full h-2 overflow-hidden"><div className="bg-gradient-to-r from-cyan-500 to-purple-600 h-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
            <p className="text-gray-400 text-sm mt-2 text-center">{Math.floor(progress)}% - {stats.valid} valid, {stats.banned} banned, {stats.bind} bind, {stats.invalid} invalid</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatsCard title="Akun Valid" value={stats.valid} type="valid" />
        <StatsCard title="Akun Invalid" value={stats.invalid} type="invalid" />
        <StatsCard title="Akun Banned" value={stats.banned} type="banned" />
        {checkMode === 'bind' && <StatsCard title="Bind Info" value={stats.bind} type="bind" />}
        <StatsCard title="Total Diperiksa" value={stats.total} type="total" />
        <StatsCard title="Level Tertinggi" value={stats.highestLevel} type="level" />
      </div>

      {results.length > 0 && <ResultTable results={results} stats={stats} mode={checkMode} />}
      
      {results.length === 0 && !isChecking && (
        <div className="text-center text-gray-500 py-8 glass-card p-6">
          Belum ada hasil pengecekan. Masukkan akun dan klik Start Checking.
        </div>
      )}

      <div className="text-center text-gray-500 text-xs mt-8">
        <p className="font-bold text-cyan-400">📌 KETERANGAN MODE:</p>
        <div className="grid md:grid-cols-3 gap-4 mt-2 text-left">
          <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20"><p className="font-bold text-red-400">🚫 CEK BAN</p><p>✓ Cek status banned dari sistem MLBB</p><p>✓ Informasi dasar akun (nama, level, rank)</p></div>
          <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20"><p className="font-bold text-green-400">✅ CEK VALID</p><p>✓ Cek login valid/tidak</p><p>✓ Nama akun, Level, Rank, Region</p><p>✓ Info binding akun (Facebook, Google, dll)</p><p>✓ Status Banned</p></div>
          <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20"><p className="font-bold text-purple-400">🔗 CEK BIND</p><p>✓ Info binding ke semua platform</p><p>✓ Detail akun yang terhubung</p><p>✓ Info device yang terdaftar</p><p>✓ Status Banned</p></div>
        </div>
        <br />
        <p>⚠️ Tips menghindari error 403:</p>
        <p>• Gunakan minimal 3 _abck cookies berbeda</p>
        <p>• Delay 8-15 detik antar akun</p>
        <p>• Rotasi _abck setiap 3 akun</p>
        <p>• Hasil cek otomatis tersimpan di History dan bisa didownload</p>
      </div>
    </div>
  );
}