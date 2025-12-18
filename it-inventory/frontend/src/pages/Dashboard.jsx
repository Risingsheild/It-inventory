import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import {
  Package, CheckCircle, Monitor, Wrench, AlertTriangle,
  AlertCircle, Shield, Clock, Laptop, Headphones, Camera, HardDrive
} from 'lucide-react';

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

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [warrantyAlerts, setWarrantyAlerts] = useState([]);
  const [recentRepairs, setRecentRepairs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, alertsRes, repairsRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getWarrantyAlerts(),
        dashboardAPI.getRecentRepairs(5),
      ]);
      
      setStats(statsRes.data);
      setWarrantyAlerts(alertsRes.data);
      setRecentRepairs(repairsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Total Assets"
          value={stats?.total_assets || 0}
          color="#3b82f6"
        />
        <StatCard
          icon={CheckCircle}
          label="Active"
          value={stats?.active_assets || 0}
          color="#22c55e"
        />
        <StatCard
          icon={Monitor}
          label="Available"
          value={stats?.available_assets || 0}
          color="#8b5cf6"
        />
        <StatCard
          icon={Wrench}
          label="In Repair"
          value={stats?.in_repair || 0}
          color="#f59e0b"
        />
      </div>

      {/* Alert Cards */}
      {(stats?.warranties_expiring_30 > 0 || stats?.warranties_expired > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats?.warranties_expiring_30 > 0 && (
            <Link to="/warranties" className="block">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-4 hover:bg-amber-500/15 transition-colors">
                <AlertTriangle className="text-amber-500" size={24} />
                <div>
                  <p className="font-semibold text-amber-500">
                    {stats.warranties_expiring_30 + stats.warranties_expiring_90} Warranties Expiring Soon
                  </p>
                  <p className="text-sm text-slate-400">Within the next 90 days</p>
                </div>
              </div>
            </Link>
          )}
          {stats?.warranties_expired > 0 && (
            <Link to="/warranties" className="block">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-4 hover:bg-red-500/15 transition-colors">
                <AlertCircle className="text-red-500" size={24} />
                <div>
                  <p className="font-semibold text-red-500">
                    {stats.warranties_expired} Warranties Expired
                  </p>
                  <p className="text-sm text-slate-400">Review for potential replacement</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Warranty Alerts */}
        <div className="bg-dark-100/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Shield size={16} className="text-amber-500" />
            Warranties Expiring Soon
          </h3>
          
          {warrantyAlerts.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No warranties expiring within 90 days</p>
          ) : (
            <div className="space-y-2">
              {warrantyAlerts.slice(0, 5).map((alert) => {
                const TypeIcon = assetTypeIcons[alert.asset.asset_type] || Package;
                const statusColor = alert.status === 'expired' ? '#ef4444' : 
                                   alert.status === 'critical' ? '#ef4444' : '#f59e0b';
                return (
                  <div key={alert.asset.id} className="flex items-center justify-between p-3 bg-dark-200/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <TypeIcon size={16} style={{ color: assetTypeColors[alert.asset.asset_type] }} />
                      <div>
                        <p className="text-sm font-medium text-white">{alert.asset.name}</p>
                        <p className="text-xs text-slate-500">{alert.asset.asset_tag}</p>
                      </div>
                    </div>
                    <span 
                      className="text-xs font-semibold px-2 py-1 rounded"
                      style={{ 
                        color: statusColor, 
                        backgroundColor: `${statusColor}20` 
                      }}
                    >
                      {alert.days_remaining < 0 
                        ? `${Math.abs(alert.days_remaining)}d ago`
                        : `${alert.days_remaining}d left`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Repairs */}
        <div className="bg-dark-100/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Wrench size={16} className="text-purple-500" />
            Recent Repairs
          </h3>
          
          {recentRepairs.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No repair history</p>
          ) : (
            <div className="space-y-2">
              {recentRepairs.map((repair) => {
                const TypeIcon = assetTypeIcons[repair.asset_type] || Package;
                return (
                  <div key={repair.id} className="flex items-center justify-between p-3 bg-dark-200/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <TypeIcon size={16} style={{ color: assetTypeColors[repair.asset_type] }} />
                      <div>
                        <p className="text-sm font-medium text-white">{repair.issue_description}</p>
                        <p className="text-xs text-slate-500">{repair.asset_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${repair.cost > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {repair.cost > 0 ? `$${repair.cost}` : 'Warranty'}
                      </p>
                      <p className="text-xs text-slate-500">{repair.repair_date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Repair Cost Summary */}
      {stats && (
        <div className="bg-dark-100/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Financial Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-dark-200/50 rounded-lg p-4">
              <p className="text-2xl font-bold text-red-400">${stats.total_repair_costs?.toLocaleString() || 0}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Total Repair Costs</p>
            </div>
            <div className="bg-dark-200/50 rounded-lg p-4">
              <p className="text-2xl font-bold text-slate-300">{stats.decommissioned || 0}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Decommissioned Assets</p>
            </div>
            <div className="bg-dark-200/50 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-400">
                {Object.keys(stats.assets_by_type || {}).length}
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Asset Categories</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-dark-100/50 border border-slate-700/50 rounded-xl p-5 relative overflow-hidden">
      <div 
        className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 -mr-5 -mt-5"
        style={{ backgroundColor: color }}
      />
      <Icon size={20} style={{ color }} className="mb-3" />
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}
