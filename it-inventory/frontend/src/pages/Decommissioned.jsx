import React, { useState, useEffect } from 'react';
import { assetsAPI } from '../services/api';
import { 
  Archive, Search, Calendar, FileText,
  Laptop, Monitor, HardDrive, Headphones, Camera, Package, DollarSign
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

export default function Decommissioned() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);

  useEffect(() => {
    fetchDecommissioned();
  }, []);

  const fetchDecommissioned = async () => {
    try {
      const response = await assetsAPI.list({ status: 'decommissioned' });
      setAssets(response.data);
    } catch (error) {
      console.error('Error fetching decommissioned assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.asset_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (asset.serial_number && asset.serial_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate stats
  const totalValue = assets.reduce((sum, a) => sum + (a.purchase_price || 0), 0);
  const totalRepairCosts = assets.reduce((sum, a) => sum + (a.total_repair_cost || 0), 0);
  const byType = assets.reduce((acc, a) => {
    acc[a.asset_type] = (acc[a.asset_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Decommissioned Assets</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Archive}
          label="Total Decommissioned"
          value={assets.length}
          color="#6b7280"
        />
        <StatCard
          icon={DollarSign}
          label="Original Value"
          value={`$${totalValue.toLocaleString()}`}
          color="#3b82f6"
        />
        <StatCard
          icon={DollarSign}
          label="Total Repair Spend"
          value={`$${totalRepairCosts.toLocaleString()}`}
          color="#ef4444"
        />
        <StatCard
          icon={Package}
          label="Asset Types"
          value={Object.keys(byType).length}
          color="#8b5cf6"
        />
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 px-4 py-3 bg-dark-100/50 border border-slate-700/50 rounded-lg">
        <Search size={18} className="text-slate-500" />
        <input
          type="text"
          placeholder="Search decommissioned assets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Assets Table */}
      <div className="bg-dark-100/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-200/50">
              {['Asset', 'Serial Number', 'Decommissioned', 'Repairs', 'Reason'].map(header => (
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
            ) : filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No decommissioned assets found
                </td>
              </tr>
            ) : (
              filteredAssets.map(asset => {
                const TypeIcon = assetTypeIcons[asset.asset_type] || Package;
                return (
                  <tr 
                    key={asset.id} 
                    className="hover:bg-slate-700/20 cursor-pointer"
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-9 h-9 rounded-lg flex items-center justify-center opacity-60"
                          style={{ backgroundColor: `${assetTypeColors[asset.asset_type]}20` }}
                        >
                          <TypeIcon size={18} style={{ color: assetTypeColors[asset.asset_type] }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-400">{asset.name}</p>
                          <p className="text-xs text-slate-600">{asset.asset_tag}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500 font-mono">{asset.serial_number || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar size={12} />
                        {asset.decommission_date || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <span className="text-slate-400">{asset.repair_count || 0} repairs</span>
                        {asset.total_repair_cost > 0 && (
                          <span className="text-red-400 ml-2">${asset.total_repair_cost}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-500 max-w-xs truncate">
                        {asset.decommission_reason || 'No reason provided'}
                      </p>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Type Breakdown */}
      {Object.keys(byType).length > 0 && (
        <div className="bg-dark-100/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Decommissioned by Type</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
              const TypeIcon = assetTypeIcons[type] || Package;
              return (
                <div 
                  key={type} 
                  className="flex items-center gap-2 px-3 py-2 bg-dark-200/50 rounded-lg"
                >
                  <TypeIcon size={16} style={{ color: assetTypeColors[type] }} />
                  <span className="text-sm text-slate-300 capitalize">{type}</span>
                  <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
        />
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

function AssetDetailModal({ asset, onClose }) {
  const TypeIcon = assetTypeIcons[asset.asset_type] || Package;
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-100 border border-slate-700 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h3 className="text-lg font-bold text-white">Decommissioned Asset Details</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        
        <div className="p-5 space-y-4">
          {/* Asset Header */}
          <div className="flex items-center gap-4 p-4 bg-dark-200/50 rounded-xl">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center opacity-60"
              style={{ backgroundColor: `${assetTypeColors[asset.asset_type]}20` }}
            >
              <TypeIcon size={24} style={{ color: assetTypeColors[asset.asset_type] }} />
            </div>
            <div>
              <h4 className="font-semibold text-white">{asset.name}</h4>
              <p className="text-sm text-slate-500">{asset.asset_tag}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <DetailItem label="Type" value={asset.asset_type} />
            <DetailItem label="Serial Number" value={asset.serial_number || '—'} />
            <DetailItem label="Manufacturer" value={asset.manufacturer || '—'} />
            <DetailItem label="Model" value={asset.model || '—'} />
            <DetailItem label="Purchase Date" value={asset.purchase_date || '—'} />
            <DetailItem label="Purchase Price" value={asset.purchase_price ? `$${asset.purchase_price}` : '—'} />
            <DetailItem label="Total Repairs" value={`${asset.repair_count || 0} ($${asset.total_repair_cost || 0})`} />
            <DetailItem label="Decommissioned" value={asset.decommission_date || '—'} />
          </div>

          {/* Decommission Reason */}
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
              <FileText size={12} className="inline mr-1" />
              Decommission Reason
            </label>
            <div className="p-3 bg-dark-200/50 rounded-lg text-sm text-slate-300">
              {asset.decommission_reason || 'No reason provided'}
            </div>
          </div>

          {/* Notes */}
          {asset.notes && (
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">Notes</label>
              <div className="p-3 bg-dark-200/50 rounded-lg text-sm text-slate-400">
                {asset.notes}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-700">
          <button onClick={onClose} className="btn-secondary w-full">Close</button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-slate-300 capitalize">{value}</p>
    </div>
  );
}
