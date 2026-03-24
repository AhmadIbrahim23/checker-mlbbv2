'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Copy, Download, Smartphone, Link, Shield } from 'lucide-react';
import { PLATFORM_ORDER } from '@/lib/constants';

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

interface ResultTableProps {
  results: AccountResult[];
  stats: {
    valid: number;
    invalid: number;
    banned: number;
    bind: number;
    total: number;
    highestLevel: number;
  };
  mode: 'ban' | 'valid' | 'bind';
}

export default function ResultTable({ results, stats, mode }: ResultTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<'all' | 'valid' | 'invalid' | 'banned' | 'bind'>('all');

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) newExpanded.delete(index);
    else newExpanded.add(index);
    setExpandedRows(newExpanded);
  };

  const filteredResults = results.filter((result) => {
    if (filter === 'all') return true;
    if (filter === 'valid') return result.success && !result.details?.isBanned;
    if (filter === 'banned') return result.details?.isBanned === true;
    if (filter === 'bind') return mode === 'bind' && result.success;
    if (filter === 'invalid') return !result.success;
    return true;
  });

  const exportResults = () => {
    const validAccounts = results.filter((r) => r.success && !r.details?.isBanned);
    const bannedAccounts = results.filter((r) => r.details?.isBanned);
    const invalidAccounts = results.filter((r) => !r.success);
    const bindAccounts = results.filter((r) => mode === 'bind' && r.success);

    const formatForExport = (accounts: AccountResult[]) => {
      return accounts.map((acc) => {
        if (acc.details) {
          let line = `${acc.email} | Nama: ${acc.details.name} | ID: ${acc.details.roleId} (${acc.details.zoneId}) | Level: ${acc.details.level} | Rank: ${acc.details.currentRank} | Region: ${acc.details.region} | Bind: ${acc.details.bindings} | Ban: ${acc.details.banStatus}`;
          if (mode === 'bind' && acc.details.bindingsDetail) {
            const bindDetails = Object.entries(acc.details.bindingsDetail).map(([p, s]) => `${p}: ${s}`).join(' | ');
            line += ` | Binding Detail: ${bindDetails}`;
          }
          if (mode === 'bind' && acc.details.devicesInfo) {
            line += ` | Devices: ${acc.details.devicesInfo}`;
          }
          return line;
        }
        return `${acc.email} | ${acc.message}`;
      }).join('\n');
    };

    const content = `=== AKUN VALID (${validAccounts.length}) ===\n${formatForExport(validAccounts)}\n\n=== AKUN BANNED (${bannedAccounts.length}) ===\n${formatForExport(bannedAccounts)}\n\n=== AKUN BIND (${bindAccounts.length}) ===\n${formatForExport(bindAccounts)}\n\n=== AKUN INVALID (${invalidAccounts.length}) ===\n${formatForExport(invalidAccounts)}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mlbb_check_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (result: AccountResult) => {
    if (!result.success) return <XCircle className="w-5 h-5 text-red-400" />;
    if (mode === 'bind') return <Link className="w-5 h-5 text-purple-400" />;
    if (result.details?.isBanned) return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    return <CheckCircle className="w-5 h-5 text-green-400" />;
  };

  const getStatusBadge = (result: AccountResult) => {
    if (!result.success) return <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">Invalid</span>;
    if (mode === 'bind') return <span className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400">Bind Info</span>;
    if (result.details?.isBanned) return <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">Banned</span>;
    return <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">Valid</span>;
  };

  return (
    <div className="glass-card p-4">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-lg text-sm transition ${filter === 'all' ? 'bg-cyan-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}>All ({stats.total})</button>
          <button onClick={() => setFilter('valid')} className={`px-3 py-1 rounded-lg text-sm transition ${filter === 'valid' ? 'bg-green-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}>Valid ({stats.valid})</button>
          <button onClick={() => setFilter('banned')} className={`px-3 py-1 rounded-lg text-sm transition ${filter === 'banned' ? 'bg-yellow-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}>Banned ({stats.banned})</button>
          {mode === 'bind' && <button onClick={() => setFilter('bind')} className={`px-3 py-1 rounded-lg text-sm transition ${filter === 'bind' ? 'bg-purple-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}>Bind ({stats.bind})</button>}
          <button onClick={() => setFilter('invalid')} className={`px-3 py-1 rounded-lg text-sm transition ${filter === 'invalid' ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}>Invalid ({stats.invalid})</button>
        </div>
        <button onClick={exportResults} className="btn-outline flex items-center gap-2 text-sm py-1 px-3"><Download className="w-4 h-4" /> Export</button>
      </div>

      <div className="overflow-x-auto max-h-96 overflow-y-auto scrollbar-custom">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-dark/90 backdrop-blur">
            <tr className="border-b border-white/10">
              <th className="text-left py-2 px-3 text-gray-400 font-medium">Status</th>
              <th className="text-left py-2 px-3 text-gray-400 font-medium">Email</th>
              <th className="text-left py-2 px-3 text-gray-400 font-medium">Nama / Rank</th>
              <th className="text-left py-2 px-3 text-gray-400 font-medium">Result</th>
              <th className="text-left py-2 px-3 text-gray-400 font-medium w-10"></th>
              </tr>
          </thead>
          <tbody>
            {filteredResults.map((result, idx) => (
              <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition">
                <td className="py-2 px-3">{getStatusIcon(result)}</td>
                <td className="py-2 px-3 font-mono text-sm">{result.email}</td>
                <td className="py-2 px-3">{result.details ? <div className="flex flex-col"><span className="text-cyan-400">{result.details.name}</span><span className="text-gray-500 text-xs">{result.details.currentRank}</span></div> : '-'}</td>
                <td className="py-2 px-3">{getStatusBadge(result)}</td>
                <td className="py-2 px-3">{result.details && <button onClick={() => toggleRow(idx)} className="text-gray-400 hover:text-white transition">{expandedRows.has(idx) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredResults.some((r, idx) => r.details && expandedRows.has(idx)) && (
        <div className="mt-4 pt-4 border-t border-white/10">
          {filteredResults.map((result, idx) => {
            if (!result.details || !expandedRows.has(idx)) return null;
            const details = result.details;
            return (
              <div key={`details-${idx}`} className="glass-card p-4 mb-3 text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 pb-3 border-b border-white/10">
                  <div><div className="text-gray-500 text-xs">Nama</div><div className="font-medium">{details.name}</div></div>
                  <div><div className="text-gray-500 text-xs">Level</div><div className="font-medium">{details.level}</div></div>
                  <div><div className="text-gray-500 text-xs">Current Rank</div><div className="font-medium text-cyan-400">{details.currentRank}</div></div>
                  <div><div className="text-gray-500 text-xs">Highest Rank</div><div className="font-medium text-purple-400">{details.highestRank}</div></div>
                  <div><div className="text-gray-500 text-xs">ID</div><div className="font-mono text-xs">{details.roleId} ({details.zoneId})</div></div>
                  <div><div className="text-gray-500 text-xs">Region</div><div className="font-medium">{details.region}</div></div>
                  <div><div className="text-gray-500 text-xs">Tanggal Dibuat</div><div className="font-medium">{details.createDate}</div></div>
                  <div><div className="text-gray-500 text-xs flex items-center gap-1"><Shield className="w-3 h-3" /> Ban Status</div><div className={`font-medium ${details.isBanned ? 'text-yellow-400' : 'text-green-400'}`}>{details.banStatus}</div></div>
                </div>

                {(mode === 'valid' || mode === 'bind') && details.bindingsDetail && (
                  <div className="mb-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2"><Link className="w-4 h-4 text-purple-400" /><span className="font-semibold text-purple-400">Detail Binding</span></div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {PLATFORM_ORDER.map((platform) => {
                        const status = details.bindingsDetail?.[platform] || '❌ Not Connected';
                        return <div key={platform} className="flex items-center gap-1"><span className="text-gray-400 w-24">{platform}:</span><span className={status.includes('✅') ? 'text-green-400' : 'text-gray-500'}>{status}</span></div>;
                      })}
                    </div>
                  </div>
                )}

                {mode === 'bind' && details.devicesInfo && (
                  <div className="mb-3 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                    <div className="flex items-center gap-2 mb-2"><Smartphone className="w-4 h-4 text-cyan-400" /><span className="font-semibold text-cyan-400">Info Device</span></div>
                    <div className="text-sm whitespace-pre-wrap">{details.devicesInfo}</div>
                  </div>
                )}

                <div className="mt-2 pt-2 border-t border-white/10 flex justify-end gap-2">
                  <button onClick={() => { let text = `${result.email} | Nama: ${details.name} | Level: ${details.level} | Rank: ${details.currentRank} | Ban: ${details.banStatus}`; if (mode === 'valid' || mode === 'bind') text += ` | Bind: ${details.bindings}`; navigator.clipboard.writeText(text); }} className="text-xs text-cyan-400 flex items-center gap-1 hover:text-cyan-300"><Copy className="w-3 h-3" /> Copy details</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}