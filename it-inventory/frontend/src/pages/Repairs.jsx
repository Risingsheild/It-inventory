import React, { useState, useEffect } from 'react';
import { dashboardAPI, assetsAPI } from '../services/api';
import { 
  Wrench, DollarSign, AlertTriangle, CheckCircle, 
  Laptop, Monitor, HardDrive, Headphones, Camera, Package,
  Calendar, TrendingUp
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

export default function Repairs() {
  const [repairs, setRepairs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [repairsRes, statsRes] = await Promise.all([
        dashboardAPI.getRecentRepairs(100),
        dashboardAPI.getStats(),
      ]);
      setRepairs(repairsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRepairs = repairs.filter(repair => {
    if (filterType === 'all') return true;
    if (filterType === 'warranty') return repair.is_warranty_repair;
    if (filterType === 'paid') return !repair.is_warranty_repair && repair.cost > 0;
    return true;
  });

  const totalCost = repairs.reduce((sum, r) => sum + (r.cost || 0), 0);
  const warrantyRepairs = repairs.filter(r => r.is_warranty_repair).length;
  const paidRepairs = repairs.filter(r => !r.is_warranty_repair && r.cost > 0).length;

  // Find frequent repair assets (3+ repairs)
  const assetRepairCounts = repairs.reduce((acc, repair) => {
    acc[repair.asset_id] = (acc[repair.asset_id] || { count: 0, name: repair.asset_name, tag: repair.asset_tag, type: repair.asset_type });
    acc[repair.asset_id].count++;
    return acc;
  }, {});
  
  const frequentRepairAssets = Object.entries(assetRepairCounts)
    .filter(([_, data]) => data.count >= 3)
    .sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Repair History</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Wrench}
          label="Total Repairs"
          value={repairs.length}
          color="#8b5cf6"
        />
        <StatCard
          icon={DollarSign}
          label="Total Cost"
          value={`$${totalCost.toLocaleString()}`}
          color="#ef4444"
        />
        <StatCard
          icon={CheckCircle}
          label="Warranty Repairs"
          value={warrantyRepairs}
          color="#22c55e"
        />
        <StatCard
          icon={DollarSign}
          label="Paid Repairs"
          value={paidRepairs}
          color="#f59e0b"
        />
      </div>

      {/* Frequent Repair Alert */}
      {frequentRepairAssets.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <h3 className="flex items-center gap-2 text-amber-500 font-semibold mb-3">
            <AlertTriangle size={18} />
            Frequent Repair Assets
          </h3>
          <p className="text-sm text-slate-400 mb-3">
            These assets have been repaired 3 or more times. Consider replacement.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {frequentRepairAssets.map(([assetId, data]) => {
              const TypeIcon = assetTypeIcons[data.type] || Package;
              return (
                <div key={assetId} className="flex items-center gap-3 p-2 bg-dark-200/50 rounded-lg">
                  <TypeIcon size={16} style={{ color: assetTypeColors[data.type] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{data.name}</p>
                    <p className="text-xs text-slate-500">{data.tag}</p>
                  </div>
                  <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-xs font-bold rounded">
                    {data.count}x
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: 'All Repairs' },
          { value: 'warranty', label: 'Warranty' },
          { value: 'paid', label: 'Paid' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilterType(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === tab.value
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Repairs Timeline */}
      <div className="bg-dark-100/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-200/50">
              {['Date', 'Asset', 'Issue', 'Type', 'Cost'].map(header => (
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
            ) : filteredRepairs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No repair history found
                </td>
              </tr>
            ) : (
              filteredRepairs.map(repair => {
                const TypeIcon = assetTypeIcons[repair.asset_type] || Package;
                return (
                  <tr key={repair.id} className="hover:bg-slate-700/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Calendar size={14} className="text-slate-500" />
                        {repair.repair_date}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${assetTypeColors[repair.asset_type]}20` }}
                        >
                          <TypeIcon size={16} style={{ color: assetTypeColors[repair.asset_type] }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{repair.asset_name}</p>
                          <p className="text-xs text-slate-500">{repair.asset_tag}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-300 max-w-xs truncate">{repair.issue_description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span 
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          repair.is_warranty_repair 
                            ? 'bg-green-500/15 text-green-400' 
                            : 'bg-slate-500/15 text-slate-400'
                        }`}
                      >
                        {repair.is_warranty_repair ? 'Warranty' : 'Paid'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${repair.cost > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {repair.cost > 0 ? `$${repair.cost.toLocaleString()}` : '$0'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Cost Breakdown by Type */}
      {repairs.length > 0 && (
        <div className="bg-dark-100/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-500" />
            Repair Costs by Asset Type
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(
              repairs.reduce((acc, r) => {
                acc[r.asset_type] = (acc[r.asset_type] || 0) + (r.cost || 0);
                return acc;
              }, {})
            ).sort((a, b) => b[1] - a[1]).map(([type, cost]) => {
              const TypeIcon = assetTypeIcons[type] || Package;
              return (
                <div key={type} className="bg-dark-200/50 rounded-lg p-3 text-center">
                  <TypeIcon size={20} className="mx-auto mb-2" style={{ color: assetTypeColors[type] }} />
                  <p className="text-lg font-bold text-white">${cost.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 capitalize">{type}</p>
                </div>
              );
            })}
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
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}
