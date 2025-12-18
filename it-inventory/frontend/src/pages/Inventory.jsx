import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { assetsAPI, employeesAPI, csvAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Search, Filter, Plus, UserPlus, Wrench, Archive, Clock,
  AlertCircle, X, Download, Upload, Laptop, Monitor, HardDrive,
  Headphones, Camera, Package, CheckCircle, Edit
} from 'lucide-react';

const assetTypes = [
  { value: 'laptop', label: 'Laptop', icon: Laptop },
  { value: 'monitor', label: 'Monitor', icon: Monitor },
  { value: 'dock', label: 'Dock', icon: HardDrive },
  { value: 'headset', label: 'Headset', icon: Headphones },
  { value: 'camera', label: 'Camera', icon: Camera },
  { value: 'keyboard', label: 'Keyboard', icon: Package },
  { value: 'mouse', label: 'Mouse', icon: Package },
  { value: 'other', label: 'Other', icon: Package },
];

const assetTypeColors = {
  laptop: '#3b82f6',
  monitor: '#8b5cf6',
  dock: '#06b6d4',
  headset: '#f59e0b',
  camera: '#ef4444',
  keyboard: '#10b981',
  mouse: '#ec4899',
  other: '#6b7280',
};

const statusConfig = {
  active: { label: 'Active', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
  available: { label: 'Available', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  repair: { label: 'In Repair', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  decommissioned: { label: 'Decommissioned', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' },
};

export default function Inventory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isTechnician } = useAuth();
  
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(searchParams.get('action') === 'add');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [showDecommissionModal, setShowDecommissionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setShowAddModal(true);
      setSearchParams({});
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const [assetsRes, employeesRes] = await Promise.all([
        assetsAPI.list(),
        employeesAPI.list(),
      ]);
      setAssets(assetsRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.asset_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.serial_number && asset.serial_number.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = !filterType || asset.asset_type === filterType;
    const matchesStatus = !filterStatus || asset.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleExportCSV = async () => {
    try {
      const response = await csvAPI.exportAssets();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assets_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getWarrantyStatus = (warrantyEnd) => {
    if (!warrantyEnd) return null;
    const days = Math.ceil((new Date(warrantyEnd) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { status: 'expired', days: Math.abs(days), color: '#ef4444' };
    if (days <= 30) return { status: 'critical', days, color: '#ef4444' };
    if (days <= 90) return { status: 'warning', days, color: '#f59e0b' };
    return { status: 'good', days, color: '#22c55e' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Inventory</h2>
        
        {isTechnician() && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            >
              <Upload size={16} />
              Import
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            >
              <Download size={16} />
              Export
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <Plus size={16} />
              Add Asset
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3">
        <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-dark-100/50 border border-slate-700/50 rounded-lg">
          <Search size={18} className="text-slate-500" />
          <input
            type="text"
            placeholder="Search assets, serial numbers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-3 bg-dark-100/50 border border-slate-700/50 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {assetTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 bg-dark-100/50 border border-slate-700/50 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          {Object.entries(statusConfig).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      {/* Assets Table */}
      <div className="bg-dark-100/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-200/50">
              {['Asset', 'Serial Number', 'Status', 'Warranty', 'Repairs', 'Actions'].map(header => (
                <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading...</td>
              </tr>
            ) : filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No assets found</td>
              </tr>
            ) : (
              filteredAssets.map(asset => {
                const TypeIcon = assetTypes.find(t => t.value === asset.asset_type)?.icon || Package;
                const warranty = getWarrantyStatus(asset.warranty_end);
                
                return (
                  <tr key={asset.id} className="hover:bg-slate-700/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${assetTypeColors[asset.asset_type]}20` }}
                        >
                          <TypeIcon size={18} style={{ color: assetTypeColors[asset.asset_type] }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{asset.name}</p>
                          <p className="text-xs text-slate-500">{asset.asset_tag}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400 font-mono">{asset.serial_number || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-semibold"
                        style={{ 
                          color: statusConfig[asset.status]?.color,
                          backgroundColor: statusConfig[asset.status]?.bg
                        }}
                      >
                        {statusConfig[asset.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {warranty ? (
                        <div className="flex items-center gap-1 text-xs" style={{ color: warranty.color }}>
                          {warranty.status === 'expired' ? (
                            <>
                              <AlertCircle size={14} />
                              <span>Expired</span>
                            </>
                          ) : (
                            <>
                              <Clock size={14} />
                              <span>{warranty.days}d</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-semibold"
                        style={{ 
                          color: asset.repair_count > 2 ? '#ef4444' : asset.repair_count > 0 ? '#f59e0b' : '#22c55e',
                          backgroundColor: asset.repair_count > 2 ? 'rgba(239, 68, 68, 0.15)' : asset.repair_count > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)'
                        }}
                      >
                        {asset.repair_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isTechnician() && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setSelectedAsset(asset); setShowAssignModal(true); }}
                            className="p-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                            title="Assign"
                          >
                            <UserPlus size={14} />
                          </button>
                          <button
                            onClick={() => { setSelectedAsset(asset); setShowRepairModal(true); }}
                            className="p-1.5 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                            title="Repair"
                          >
                            <Wrench size={14} />
                          </button>
                          {asset.status !== 'decommissioned' && (
                            <button
                              onClick={() => { setSelectedAsset(asset); setShowDecommissionModal(true); }}
                              className="p-1.5 rounded bg-slate-500/10 text-slate-400 hover:bg-slate-500/20"
                              title="Decommission"
                            >
                              <Archive size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddAssetModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchData}
        />
      )}

      {showAssignModal && selectedAsset && (
        <AssignModal
          asset={selectedAsset}
          employees={employees}
          onClose={() => { setShowAssignModal(false); setSelectedAsset(null); }}
          onSuccess={fetchData}
        />
      )}

      {showRepairModal && selectedAsset && (
        <RepairModal
          asset={selectedAsset}
          onClose={() => { setShowRepairModal(false); setSelectedAsset(null); }}
          onSuccess={fetchData}
        />
      )}

      {showDecommissionModal && selectedAsset && (
        <DecommissionModal
          asset={selectedAsset}
          onClose={() => { setShowDecommissionModal(false); setSelectedAsset(null); }}
          onSuccess={fetchData}
        />
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}

// Add Asset Modal
function AddAssetModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    asset_type: 'laptop',
    name: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    purchase_date: '',
    purchase_price: '',
    warranty_end: '',
    vendor: '',
    location: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await assetsAPI.create({
        ...form,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Add New Asset" onClose={onClose}>
      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Asset Type">
            <select
              value={form.asset_type}
              onChange={(e) => setForm({ ...form, asset_type: e.target.value })}
              className="input-field"
            >
              {assetTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Name *">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g., Dell Latitude 5540"
              className="input-field"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Manufacturer">
            <input
              type="text"
              value={form.manufacturer}
              onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
              placeholder="e.g., Dell"
              className="input-field"
            />
          </FormField>

          <FormField label="Model">
            <input
              type="text"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder="e.g., Latitude 5540"
              className="input-field"
            />
          </FormField>
        </div>

        <FormField label="Serial Number">
          <input
            type="text"
            value={form.serial_number}
            onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
            placeholder="Device serial number"
            className="input-field"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Purchase Date">
            <input
              type="date"
              value={form.purchase_date}
              onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
              className="input-field"
            />
          </FormField>

          <FormField label="Warranty End">
            <input
              type="date"
              value={form.warranty_end}
              onChange={(e) => setForm({ ...form, warranty_end: e.target.value })}
              className="input-field"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Purchase Price">
            <input
              type="number"
              step="0.01"
              value={form.purchase_price}
              onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
              placeholder="0.00"
              className="input-field"
            />
          </FormField>

          <FormField label="Vendor">
            <input
              type="text"
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              placeholder="Purchase vendor"
              className="input-field"
            />
          </FormField>
        </div>

        <FormField label="Location">
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Office location"
            className="input-field"
          />
        </FormField>

        <FormField label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            placeholder="Additional notes..."
            className="input-field resize-none"
          />
        </FormField>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Adding...' : 'Add Asset'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Assign Modal
function AssignModal({ asset, employees, onClose, onSuccess }) {
  const [selectedEmployee, setSelectedEmployee] = useState(asset.assigned_to || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await assetsAPI.assign(asset.id, selectedEmployee || null);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to assign:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Assign User" onClose={onClose}>
      <div className="p-3 bg-dark-200/50 rounded-lg mb-4">
        <p className="font-medium text-white">{asset.name}</p>
        <p className="text-sm text-slate-500">{asset.asset_tag}</p>
      </div>

      <FormField label="Select Employee">
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="input-field"
        >
          <option value="">Unassigned</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
          ))}
        </select>
      </FormField>

      <div className="flex gap-3 pt-4">
        <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
          {loading ? 'Saving...' : 'Save Assignment'}
        </button>
      </div>
    </Modal>
  );
}

// Repair Modal
function RepairModal({ asset, onClose, onSuccess }) {
  const [form, setForm] = useState({
    repair_date: new Date().toISOString().split('T')[0],
    issue_description: '',
    cost: 0,
    is_warranty_repair: false,
  });
  const [loading, setLoading] = useState(false);

  const handleAddRepair = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await assetsAPI.addRepair(asset.id, {
        ...form,
        cost: parseFloat(form.cost) || 0,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to add repair:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkFixed = async () => {
    setLoading(true);
    try {
      await assetsAPI.markFixed(asset.id);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to mark fixed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Repair Management" onClose={onClose}>
      <div className="p-3 bg-dark-200/50 rounded-lg mb-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-white">{asset.name}</p>
          <p className="text-sm text-slate-500">{asset.asset_tag}</p>
        </div>
        <span 
          className="px-2 py-1 rounded-full text-xs font-semibold"
          style={{ 
            color: statusConfig[asset.status]?.color,
            backgroundColor: statusConfig[asset.status]?.bg
          }}
        >
          {statusConfig[asset.status]?.label}
        </span>
      </div>

      {asset.status === 'repair' && (
        <button
          onClick={handleMarkFixed}
          disabled={loading}
          className="w-full p-3 mb-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 font-semibold hover:bg-green-500/20 flex items-center justify-center gap-2"
        >
          <CheckCircle size={18} />
          Mark as Fixed
        </button>
      )}

      <form onSubmit={handleAddRepair} className="space-y-4">
        <h4 className="font-semibold text-white">Log New Repair</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Date">
            <input
              type="date"
              value={form.repair_date}
              onChange={(e) => setForm({ ...form, repair_date: e.target.value })}
              required
              className="input-field"
            />
          </FormField>

          <FormField label="Cost ($0 for warranty)">
            <input
              type="number"
              step="0.01"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
              className="input-field"
            />
          </FormField>
        </div>

        <FormField label="Issue Description">
          <input
            type="text"
            value={form.issue_description}
            onChange={(e) => setForm({ ...form, issue_description: e.target.value })}
            required
            placeholder="e.g., Battery replacement"
            className="input-field"
          />
        </FormField>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={form.is_warranty_repair}
            onChange={(e) => setForm({ ...form, is_warranty_repair: e.target.checked, cost: e.target.checked ? 0 : form.cost })}
            className="rounded"
          />
          Warranty Repair
        </label>

        <button type="submit" disabled={loading} className="btn-warning w-full flex items-center justify-center gap-2">
          <Wrench size={16} />
          {loading ? 'Logging...' : 'Log Repair'}
        </button>
      </form>
    </Modal>
  );
}

// Decommission Modal
function DecommissionModal({ asset, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await assetsAPI.decommission(asset.id, reason);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to decommission:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Decommission Asset" onClose={onClose}>
      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-4 flex items-center gap-3 text-red-400 text-sm">
        <AlertCircle size={18} />
        This action will permanently retire this asset from inventory.
      </div>

      <div className="p-3 bg-dark-200/50 rounded-lg mb-4">
        <p className="font-medium text-white">{asset.name}</p>
        <p className="text-sm text-slate-500">{asset.asset_tag} • {asset.repair_count || 0} repairs • ${asset.total_repair_cost || 0} repair cost</p>
      </div>

      <form onSubmit={handleSubmit}>
        <FormField label="Decommission Reason *">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            minLength={10}
            rows={3}
            placeholder="Document why this asset is being decommissioned..."
            className="input-field resize-none"
          />
        </FormField>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading || reason.length < 10} className="btn-danger flex-1 flex items-center justify-center gap-2">
            <Archive size={16} />
            {loading ? 'Processing...' : 'Decommission'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Import Modal
function ImportModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const response = await csvAPI.importAssets(file);
      setResult(response.data);
      if (response.data.success_count > 0) {
        onSuccess();
      }
    } catch (error) {
      setResult({ success_count: 0, error_count: 1, errors: [error.response?.data?.detail || 'Import failed'] });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await csvAPI.downloadTemplate();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'asset_import_template.csv';
      a.click();
    } catch (error) {
      console.error('Template download failed:', error);
    }
  };

  return (
    <Modal title="Import Assets" onClose={onClose}>
      {result ? (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${result.success_count > 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
            <p className={result.success_count > 0 ? 'text-green-400' : 'text-red-400'}>
              {result.success_count} assets imported successfully
            </p>
            {result.error_count > 0 && (
              <p className="text-red-400">{result.error_count} errors</p>
            )}
          </div>
          
          {result.errors?.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-400">{err}</p>
              ))}
            </div>
          )}

          <button onClick={onClose} className="btn-primary w-full">Done</button>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={handleDownloadTemplate}
            className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 flex items-center justify-center gap-2"
          >
            <Download size={16} />
            Download CSV Template
          </button>

          <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files[0])}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload size={32} className="mx-auto text-slate-500 mb-2" />
              <p className="text-slate-400">
                {file ? file.name : 'Click to select CSV file'}
              </p>
            </label>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button 
              onClick={handleImport} 
              disabled={!file || loading} 
              className="btn-primary flex-1"
            >
              {loading ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// Reusable Components
function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-100 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
