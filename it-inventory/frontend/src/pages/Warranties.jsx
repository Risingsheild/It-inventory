import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import { Shield, AlertTriangle, AlertCircle, CheckCircle, Clock, Laptop, Monitor, HardDrive, Headphones, Camera, Package } from 'lucide-react';

const assetTypeIcons = {
  laptop: Laptop,
  monitor: Monitor,
  dock: HardDrive,
  headset: Headphones,
  camera: Camera,
  other: Package,
};

const assetTypeColors = {
  laptop: '#3b82f6',
  monitor: '#8b5cf6',
  dock: '#06b6d4',
  headset: '#f59e0b',
  camera: '#ef4444',
  other: '#6b7280',
};

export default function Warranties() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchWarrantyAlerts();
  }, []);

  const fetchWarrantyAlerts = async () => {
    try {
      const response = await dashboardAPI.getWarrantyAlerts();
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching warranty alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterStatus === 'all') return true;
    return alert.status === filterStatus;
  });

  const stats = {
    expired: alerts.filter(a => a.status === 'expired').length,
    critical: alerts.filter(a => a.status === 'critical').length,
    warning: alerts.filter(a => a.status === 'warning').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Warranty Tracking</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={AlertCircle}
          label="Expired"
          value={stats.expired}
          color="#ef4444"
          onClick={() => setFilterStatus(filterStatus === 'expired' ? 'all' : 'expired')}
          active={filterStatus === 'expired'}
        />
        <StatCard
          icon={AlertTriangle}
          label="Critical (≤30 days)"
          value={stats.critical}
          color="#f59e0b"
          onClick={() => setFilterStatus(filterStatus === 'critical' ? 'all' : 'critical')}
          active={filterStatus === 'critical'}
        />
        <StatCard
          icon={Clock}
          label="Warning (≤90 days)"
          value={stats.warning}
          color="#eab308"
          onClick={() => setFilterStatus(filterStatus === 'warning' ? 'all' : 'warning')}
          active={filterStatus === 'warning'}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'expired', 'critical', 'warning'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === status
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {status === 'all' ? 'All Alerts' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Warranty Table */}
      <div className="bg-dark-100/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-200/50">
              {['Asset', 'Serial Number', 'Warranty End', 'Status', 'Time Remaining'].map(header => (
                <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading...</td>
              </tr>
            ) : filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  {filterStatus === 'all' 
                    ? 'No warranty alerts - all warranties are healthy!' 
                    : `No ${filterStatus} warranties`}
                </td>
              </tr>
            ) : (
              filteredAlerts.map(alert => {
                const TypeIcon = assetTypeIcons[alert.asset.asset_type] || Package;
                const statusConfig = getStatusConfig(alert.status);
                
                return (
                  <tr key={alert.asset.id} className="hover:bg-slate-700/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${assetTypeColors[alert.asset.asset_type]}20` }}
                        >
                          <TypeIcon size={18} style={{ color: assetTypeColors[alert.asset.asset_type] }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{alert.asset.name}</p>
                          <p className="text-xs text-slate-500">{alert.asset.asset_tag}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400 font-mono">{alert.asset.serial_number || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-300">{alert.asset.warranty_end}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span 
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold"
                        style={{ color: statusConfig.color, backgroundColor: statusConfig.bg }}
                      >
                        <statusConfig.icon size={12} />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <WarrantyBar daysRemaining={alert.days_remaining} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="bg-dark-100/50 border border-slate-700/50 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-white mb-3">Warranty Status Legend</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-slate-400">Expired or ≤30 days - Immediate action required</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-slate-400">31-90 days - Plan for renewal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-slate-400">&gt;90 days - Healthy warranty</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`bg-dark-100/50 border rounded-xl p-5 text-left transition-all ${
        active ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-700/50 hover:border-slate-600'
      }`}
    >
      <Icon size={20} style={{ color }} className="mb-3" />
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
    </button>
  );
}

function WarrantyBar({ daysRemaining }) {
  let color, bgColor, text;
  
  if (daysRemaining < 0) {
    color = '#ef4444';
    bgColor = 'rgba(239, 68, 68, 0.2)';
    text = `Expired ${Math.abs(daysRemaining)} days ago`;
  } else if (daysRemaining <= 30) {
    color = '#ef4444';
    bgColor = 'rgba(239, 68, 68, 0.2)';
    text = `${daysRemaining} days left`;
  } else if (daysRemaining <= 90) {
    color = '#f59e0b';
    bgColor = 'rgba(245, 158, 11, 0.2)';
    text = `${daysRemaining} days left`;
  } else {
    color = '#22c55e';
    bgColor = 'rgba(34, 197, 94, 0.2)';
    text = `${daysRemaining} days left`;
  }

  const percentage = daysRemaining <= 0 ? 100 : Math.min(100, Math.max(0, ((90 - daysRemaining) / 90) * 100));

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span style={{ color }}>{text}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: bgColor }}>
        <div 
          className="h-full rounded-full transition-all"
          style={{ 
            width: `${daysRemaining < 0 ? 100 : percentage}%`,
            backgroundColor: color 
          }}
        />
      </div>
    </div>
  );
}

function getStatusConfig(status) {
  switch (status) {
    case 'expired':
      return { 
        icon: AlertCircle, 
        label: 'Expired', 
        color: '#ef4444', 
        bg: 'rgba(239, 68, 68, 0.15)' 
      };
    case 'critical':
      return { 
        icon: AlertTriangle, 
        label: 'Critical', 
        color: '#ef4444', 
        bg: 'rgba(239, 68, 68, 0.15)' 
      };
    case 'warning':
      return { 
        icon: Clock, 
        label: 'Warning', 
        color: '#f59e0b', 
        bg: 'rgba(245, 158, 11, 0.15)' 
      };
    default:
      return { 
        icon: CheckCircle, 
        label: 'Good', 
        color: '#22c55e', 
        bg: 'rgba(34, 197, 94, 0.15)' 
      };
  }
}
