import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, csvAPI } from '../services/api';
import { 
  User, Users, Mail, Shield, Bell, Download, Upload, 
  Database, Trash2, Edit, X, CheckCircle, AlertCircle
} from 'lucide-react';

export default function Settings() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Settings</h2>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700/50 pb-3">
        <TabButton 
          active={activeTab === 'profile'} 
          onClick={() => setActiveTab('profile')}
          icon={User}
          label="Profile"
        />
        {isAdmin() && (
          <TabButton 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')}
            icon={Users}
            label="User Management"
          />
        )}
        <TabButton 
          active={activeTab === 'data'} 
          onClick={() => setActiveTab('data')}
          icon={Database}
          label="Data Management"
        />
        <TabButton 
          active={activeTab === 'notifications'} 
          onClick={() => setActiveTab('notifications')}
          icon={Bell}
          label="Notifications"
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && <ProfileSection user={user} />}
      {activeTab === 'users' && isAdmin() && <UserManagementSection />}
      {activeTab === 'data' && <DataManagementSection />}
      {activeTab === 'notifications' && <NotificationsSection />}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-500 text-white'
          : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function ProfileSection({ user }) {
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await authAPI.updateProfile(form);
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="bg-dark-100/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Profile Settings</h3>
        
        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
            message.type === 'success' 
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Username</label>
            <input
              type="text"
              value={user?.username || ''}
              disabled
              className="input-field opacity-50 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">Username cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Full Name</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Role</label>
            <div className="flex items-center gap-2 px-4 py-3 bg-dark-200/50 border border-slate-700 rounded-lg">
              <Shield size={16} className="text-blue-400" />
              <span className="text-white capitalize">{user?.role}</span>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-4">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

function UserManagementSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await authAPI.listUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId, data) => {
    try {
      await authAPI.updateUser(userId, data);
      fetchUsers();
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await authAPI.deleteUser(userId);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const roleColors = {
    admin: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
    technician: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    viewer: { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' },
  };

  return (
    <div>
      <div className="bg-dark-100/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-lg font-semibold text-white">Manage Users</h3>
          <p className="text-sm text-slate-400">Add, edit, or remove system users</p>
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-dark-200/50">
              {['User', 'Role', 'Status', 'Actions'].map(header => (
                <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading...</td>
              </tr>
            ) : (
              users.map(u => (
                <tr key={u.id} className="hover:bg-slate-700/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                        {u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{u.full_name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-semibold capitalize"
                      style={{ 
                        color: roleColors[u.role]?.color,
                        backgroundColor: roleColors[u.role]?.bg
                      }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      u.is_active 
                        ? 'bg-green-500/15 text-green-400' 
                        : 'bg-slate-500/15 text-slate-400'
                    }`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="p-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onSave={handleUpdateUser}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  );
}

function EditUserModal({ user, onSave, onClose }) {
  const [form, setForm] = useState({
    role: user.role,
    is_active: user.is_active,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(user.id, form);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-100 border border-slate-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h3 className="text-lg font-bold text-white">Edit User</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-dark-200/50 rounded-lg">
            <p className="font-medium text-white">{user.full_name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="input-field"
            >
              <option value="admin">Admin</option>
              <option value="technician">Technician</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded"
            />
            Active User
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DataManagementSection() {
  const handleExportAssets = async () => {
    try {
      const response = await csvAPI.exportAssets();
      downloadBlob(response.data, `assets_export_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleExportEmployees = async () => {
    try {
      const response = await csvAPI.exportEmployees();
      downloadBlob(response.data, `employees_export_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await csvAPI.downloadTemplate();
      downloadBlob(response.data, 'asset_import_template.csv');
    } catch (error) {
      console.error('Template download failed:', error);
    }
  };

  const downloadBlob = (data, filename) => {
    const blob = new Blob([data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Export Section */}
      <div className="bg-dark-100/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Download size={20} className="text-blue-400" />
          Export Data
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Download your inventory data as CSV files for backup or analysis.
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleExportAssets} className="btn-secondary flex items-center justify-center gap-2">
            <Download size={16} />
            Export Assets
          </button>
          <button onClick={handleExportEmployees} className="btn-secondary flex items-center justify-center gap-2">
            <Download size={16} />
            Export Employees
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-dark-100/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Upload size={20} className="text-green-400" />
          Import Data
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Bulk import assets or employees using CSV files. Download the template first to ensure correct formatting.
        </p>
        
        <button onClick={handleDownloadTemplate} className="btn-secondary flex items-center gap-2">
          <Download size={16} />
          Download Import Template
        </button>

        <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-sm text-amber-400">
            <AlertCircle size={14} className="inline mr-1" />
            To import data, use the Import button on the Inventory or Employees pages.
          </p>
        </div>
      </div>
    </div>
  );
}

function NotificationsSection() {
  return (
    <div className="max-w-2xl">
      <div className="bg-dark-100/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Bell size={20} className="text-purple-400" />
          Email Notifications
        </h3>
        
        <div className="space-y-4">
          <div className="p-4 bg-dark-200/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white">Warranty Expiration Alerts</h4>
              <span className="px-2 py-1 bg-green-500/15 text-green-400 text-xs rounded-full">Active</span>
            </div>
            <p className="text-sm text-slate-400">
              Automatic daily emails are sent to admin and technician users when warranties are expiring within 90 days.
            </p>
          </div>

          <div className="p-4 bg-dark-200/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white">Asset Assignment Notifications</h4>
              <span className="px-2 py-1 bg-green-500/15 text-green-400 text-xs rounded-full">Active</span>
            </div>
            <p className="text-sm text-slate-400">
              Employees receive an email when IT equipment is assigned to them.
            </p>
          </div>

          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-700">
            <h4 className="font-medium text-slate-400 mb-2">SMTP Configuration</h4>
            <p className="text-sm text-slate-500">
              Email notifications require SMTP configuration in the backend environment variables.
              Contact your system administrator to enable email features.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
