"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface MagicLinkStats {
  total: number;
  used: number;
  expired: number;
  pending: number;
}

interface RateLimitStats {
  totalRequests: number;
  ipBlocks: number;
  emailBlocks: number;
  uniqueIPs: number;
  uniqueEmails: number;
}

interface HourlyData {
  hour: number;
  created: number;
  used: number;
}

interface TopDomain {
  domain: string;
  count: number;
}

interface RecentLink {
  id: string;
  email: string;
  used: boolean;
  createdAt: number;
  usedAt?: number;
  expires: number;
  ipAddress?: string;
  userAgent?: string;
}

interface SystemHealth {
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    external: number;
  };
  timestamp: number;
}

interface DashboardData {
  magicLinks: MagicLinkStats;
  rateLimits: RateLimitStats;
  hourlyStats: HourlyData[];
  topDomains: TopDomain[];
  systemHealth: SystemHealth;
}

export default function MagicLinkDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentLinks, setRecentLinks] = useState<RecentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'recent' | 'activity'>('overview');

  const fetchDashboardData = async () => {
    try {
      const [statsRes, recentRes] = await Promise.all([
        fetch('/api/admin/magic-links?action=stats'),
        fetch('/api/admin/magic-links?action=recent&limit=20')
      ]);

      if (!statsRes.ok || !recentRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const statsData = await statsRes.json();
      const recentData = await recentRes.json();

      setData(statsData);
      setRecentLinks(recentData.links);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const cleanup = async () => {
    try {
      const response = await fetch('/api/admin/magic-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' }),
      });

      if (response.ok) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  };

  const revokeLink = async (linkId: string) => {
    try {
      const response = await fetch('/api/admin/magic-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke-link', linkId }),
      });

      if (response.ok) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error('Revoke error:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchDashboardData, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const formatMemory = (bytes: number) => {
    return `${Math.round(bytes)} MB`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusBadge = (link: RecentLink) => {
    const now = Date.now();
    if (link.used) {
      return <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">Used</span>;
    }
    if (link.expires < now) {
      return <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full">Expired</span>;
    }
    return <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full">Pending</span>;
  };

  const getSuccessRate = () => {
    if (data && data.magicLinks.total > 0) {
      return Math.round((data.magicLinks.used / data.magicLinks.total) * 100);
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4 border-emerald-500" />
          <span className="text-gray-400 text-sm">Loading telemetry...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
            fetchDashboardData();
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Magic Link Dashboard</h1>
          <p className="text-gray-400">Monitor and manage magic link authentication</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-400">Auto-refresh</span>
          </label>
          <button
            onClick={cleanup}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Cleanup
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'recent', name: 'Recent Links' },
            { id: 'activity', name: 'Activity' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#11111a] border border-[#22222a] rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Links</p>
                  <p className="text-2xl font-bold text-white">{data.magicLinks.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-[#11111a] border border-[#22222a] rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Used Links</p>
                  <p className="text-2xl font-bold text-green-400">{data.magicLinks.used}</p>
                </div>
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-[#11111a] border border-[#22222a] rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Success Rate</p>
                  <p className="text-2xl font-bold text-purple-400">{getSuccessRate()}%</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-[#11111a] border border-[#22222a] rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Rate Limits</p>
                  <p className="text-2xl font-bold text-yellow-400">{data.rateLimits.totalRequests}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-[#11111a] border border-[#22222a] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">System Health</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Server Uptime</p>
                <p className="text-xl font-bold text-white">{formatUptime(data.systemHealth.uptime)}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Memory Used</p>
                <p className="text-xl font-bold text-white">
                  {formatMemory(data.systemHealth.memoryUsage.used)} / {formatMemory(data.systemHealth.memoryUsage.total)}
                </p>
                <div className="mt-2 w-full bg-gray-600 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all"
                    style={{
                      width: `${Math.round(
                        (data.systemHealth.memoryUsage.used / data.systemHealth.memoryUsage.total) * 100
                      )}%`
                    }}
                  />
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Last Updated</p>
                <p className="text-xl font-bold text-white">
                  {new Date(data.systemHealth.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          {/* Rate Limit Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#11111a] border border-[#22222a] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Rate Limit Breakdown</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">IP-based limits</span>
                  <span className="text-white font-medium">{data.rateLimits.ipBlocks}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full transition-all"
                    style={{
                      width: data.rateLimits.totalRequests > 0
                        ? `${Math.round((data.rateLimits.ipBlocks / data.rateLimits.totalRequests) * 100)}%`
                        : '0%'
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Email-based limits</span>
                  <span className="text-white font-medium">{data.rateLimits.emailBlocks}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all"
                    style={{
                      width: data.rateLimits.totalRequests > 0
                        ? `${Math.round((data.rateLimits.emailBlocks / data.rateLimits.totalRequests) * 100)}%`
                        : '0%'
                    }}
                  />
                </div>
                <div className="pt-2 border-t border-gray-700 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Unique IPs</p>
                    <p className="text-lg font-bold text-white">{data.rateLimits.uniqueIPs}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Unique Emails</p>
                    <p className="text-lg font-bold text-white">{data.rateLimits.uniqueEmails}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Domains */}
            <div className="bg-[#11111a] border border-[#22222a] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Top Email Domains</h3>
              {data.topDomains.length === 0 ? (
                <p className="text-gray-400 text-sm">No domain data available</p>
              ) : (
                <div className="space-y-3">
                  {data.topDomains.map((domain, index) => (
                    <div key={domain.domain}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-300">{domain.domain}</span>
                        <span className="text-sm font-medium text-white">{domain.count}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: data.topDomains[0].count > 0
                              ? `${Math.round((domain.count / data.topDomains[0].count) * 100)}%`
                              : '0%',
                            background: [
                              '#3b82f6',
                              '#8b5cf6',
                              '#10b981',
                              '#f59e0b',
                              '#ef4444',
                            ][index % 5],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hourly Chart */}
          <div className="bg-[#11111a] border border-[#22222a] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">24-Hour Activity</h3>
            <div className="flex items-end gap-1 h-32">
              {data.hourlyStats.map((stat, index) => {
                const maxVal = Math.max(...data.hourlyStats.map(s => s.created), 1);
                const heightPct = (stat.created / maxVal) * 100;
                const usedHeightPct = stat.created > 0 ? (stat.used / stat.created) * heightPct : 0;
                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col justify-end gap-0.5 group relative"
                    title={`Hour ${stat.hour}: ${stat.created} created, ${stat.used} used`}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      {String(stat.hour).padStart(2, '0')}:00 — {stat.created} sent, {stat.used} used
                    </div>
                    <div
                      className="w-full bg-green-500/70 rounded-t-sm"
                      style={{ height: `${usedHeightPct}%`, minHeight: stat.used > 0 ? '2px' : '0px' }}
                    />
                    <div
                      className="w-full bg-blue-500/40 rounded-t-sm"
                      style={{ height: `${heightPct - usedHeightPct}%`, minHeight: stat.created > 0 ? '2px' : '0px' }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500/40 rounded-sm" />
                <span className="text-xs text-gray-400">Created</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500/70 rounded-sm" />
                <span className="text-xs text-gray-400">Used</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Links Tab */}
      {selectedTab === 'recent' && (
        <div className="bg-[#11111a] border border-[#22222a] rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Recent Magic Links</h3>
            <button
              onClick={fetchDashboardData}
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900/50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Expires</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">IP Address</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {recentLinks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No magic links found
                    </td>
                  </tr>
                ) : (
                  recentLinks.map((link) => (
                    <tr key={link.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="py-3 px-4 text-sm text-white">{link.email}</td>
                      <td className="py-3 px-4">{getStatusBadge(link)}</td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {link.createdAt
                          ? formatDistanceToNow(new Date(link.createdAt), { addSuffix: true })
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {link.expires
                          ? formatDistanceToNow(new Date(link.expires), { addSuffix: true })
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400 font-mono">
                        {link.ipAddress || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {!link.used && link.expires > Date.now() && (
                            <button
                              onClick={() => revokeLink(link.id)}
                              className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {selectedTab === 'activity' && (
        <div className="space-y-6">
          {/* Magic Link Status Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#11111a] border border-[#22222a] rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <p className="text-sm font-medium text-gray-400">Pending</p>
              </div>
              <p className="text-3xl font-bold text-white">{data.magicLinks.pending}</p>
              <p className="text-xs text-gray-500 mt-1">Active, not yet used</p>
            </div>

            <div className="bg-[#11111a] border border-[#22222a] rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <p className="text-sm font-medium text-gray-400">Expired</p>
              </div>
              <p className="text-3xl font-bold text-white">{data.magicLinks.expired}</p>
              <p className="text-xs text-gray-500 mt-1">Passed expiry without use</p>
            </div>

            <div className="bg-[#11111a] border border-[#22222a] rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <p className="text-sm font-medium text-gray-400">Completed</p>
              </div>
              <p className="text-3xl font-bold text-white">{data.magicLinks.used}</p>
              <p className="text-xs text-gray-500 mt-1">Successfully authenticated</p>
            </div>
          </div>

          {/* Rate Limiting Activity */}
          <div className="bg-[#11111a] border border-[#22222a] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Rate Limiting Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-400">Last Hour Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                    <span className="text-sm text-gray-300">Total Requests</span>
                    <span className="text-sm font-bold text-white">{data.rateLimits.totalRequests}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                    <span className="text-sm text-gray-300">IP Limit Hits</span>
                    <span className="text-sm font-bold text-orange-400">{data.rateLimits.ipBlocks}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                    <span className="text-sm text-gray-300">Email Limit Hits</span>
                    <span className="text-sm font-bold text-red-400">{data.rateLimits.emailBlocks}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                    <span className="text-sm text-gray-300">Unique IPs</span>
                    <span className="text-sm font-bold text-blue-400">{data.rateLimits.uniqueIPs}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                    <span className="text-sm text-gray-300">Unique Emails</span>
                    <span className="text-sm font-bold text-purple-400">{data.rateLimits.uniqueEmails}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-400">Quick Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={cleanup}
                    className="w-full p-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors text-sm font-medium text-left flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clean Expired Links & Rate Limits
                  </button>
                  <button
                    onClick={async () => {
                      const res = await fetch('/api/admin/magic-links', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'force-cleanup' }),
                      });
                      if (res.ok) await fetchDashboardData();
                    }}
                    className="w-full p-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors text-sm font-medium text-left flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Force Cleanup All Used & Expired
                  </button>
                  <button
                    onClick={fetchDashboardData}
                    className="w-full p-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors text-sm font-medium text-left flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Dashboard Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
