'use client';

import { CheckCircle, XCircle, AlertTriangle, Crown, Users, Link } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  type: 'valid' | 'invalid' | 'banned' | 'total' | 'level' | 'bind';
}

const config = {
  valid: { color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle, label: 'Valid' },
  invalid: { color: 'text-red-400', bg: 'bg-red-500/10', icon: XCircle, label: 'Invalid' },
  banned: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: AlertTriangle, label: 'Banned' },
  total: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Users, label: 'Total' },
  level: { color: 'text-purple-400', bg: 'bg-purple-500/10', icon: Crown, label: 'Highest Level' },
  bind: { color: 'text-pink-400', bg: 'bg-pink-500/10', icon: Link, label: 'Bind Info' },
};

export default function StatsCard({ title, value, type }: StatsCardProps) {
  const cfg = config[type];
  const Icon = cfg.icon;

  return (
    <div className={`stat-card ${cfg.bg} border ${cfg.color.replace('text', 'border')}/20`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{title}</span>
        <Icon className={`w-5 h-5 ${cfg.color}`} />
      </div>
      <div className={`text-3xl font-bold ${cfg.color}`}>{value.toLocaleString()}</div>
      <div className="text-gray-500 text-xs mt-1">{cfg.label}</div>
    </div>
  );
}