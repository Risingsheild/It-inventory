import React, { useState, useEffect } from 'react';
import { employeesAPI, csvAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Search, Plus, Edit, Trash2, X, Users, Package, Download, Upload,
  Mail, MapPin, Building, User
} from 'lucide-react';

export default function Employees() {
  const { isTechnician } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.list({ active_only: false });
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (emp.department && emp.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleExport = async () => {
    try {
      const response = await csvAPI.exportEmployees();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleDelete = async (employee) => {
    if (!confirm(`Are you sure you want to deactivate ${employee.full_name}? Their assets will be unassigned.`)) {
      return;
    }
    try {
      await employeesAPI.delete(employee.id);
      fetchEmployees();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Employees</h2>
        
        {isTechnician() && (
          <div className="flex gap-2">
            <button
              onClick={handleExport}
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
              Add Employee
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 px-4 py-3 bg-dark-100/50 border border-slate-700/50 rounded-lg">
        <Search size={18} className="text-slate-500" />
        <input
          type="text"
          placeholder="Search employees, departments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8 text-slate-500">Loading...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="col-span-full text-center py-8 text-slate-500">No employees found</div>
        ) : (
          filteredEmployees.map(employee => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onEdit={() => { setSelectedEmployee(employee); setShowEditModal(true); }}
              onDelete={() => handleDelete(employee)}
              onViewAssets={() => { setSelectedEmployee(employee); setShowAssetsModal(true); }}
              canEdit={isTechnician()}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <EmployeeModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchEmployees}
        />
      )}

      {showEditModal && selectedEmployee && (
        <EmployeeModal
          employee={selectedEmployee}
          onClose={() => { setShowEditModal(false); setSelectedEmployee(null); }}
          onSuccess={fetchEmployees}
        />
      )}

      {showAssetsModal && selectedEmployee && (
        <EmployeeAssetsModal
          employee={selectedEmployee}
          onClose={() => { setShowAssetsModal(false); setSelectedEmployee(null); }}
        />
      )}
    </div>
  );
}

function EmployeeCard({ employee, onEdit, onDelete, onViewAssets, canEdit }) {
  return (
    <div className={`bg-dark-100/50 border border-slate-700/50 rounded-xl p-5 ${!employee.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
            {employee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h3 className="font-semibold text-white">{employee.full_name}</h3>
            {employee.employee_id && (
              <p className="text-xs text-slate-500">ID: {employee.employee_id}</p>
            )}
          </div>
        </div>
        {!employee.is_active && (
          <span className="px-2 py-1 bg-slate-500/20 text-slate-400 text-xs rounded-full">Inactive</span>
        )}
      </div>

      <div className="space-y-2 text-sm mb-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Mail size={14} />
          <span className="truncate">{employee.email}</span>
        </div>
        {employee.department && (
          <div className="flex items-center gap-2 text-slate-400">
            <Building size={14} />
            <span>{employee.department}</span>
          </div>
        )}
        {employee.location && (
          <div className="flex items-center gap-2 text-slate-400">
            <MapPin size={14} />
            <span>{employee.location}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-3 border-t border-slate-700/50">
        <button
          onClick={onViewAssets}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
        >
          <Package size={14} />
          Assets
        </button>
        {canEdit && (
          <>
            <button
              onClick={onEdit}
              className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
            >
              <Edit size={14} />
            </button>
            {employee.is_active && (
              <button
                onClick={onDelete}
                className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmployeeModal({ employee, onClose, onSuccess }) {
  const [form, setForm] = useState({
    employee_id: employee?.employee_id || '',
    full_name: employee?.full_name || '',
    email: employee?.email || '',
    department: employee?.department || '',
    location: employee?.location || '',
    manager: employee?.manager || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (employee) {
        await employeesAPI.update(employee.id, form);
      } else {
        await employeesAPI.create(form);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={employee ? 'Edit Employee' : 'Add Employee'} onClose={onClose}>
      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Full Name *">
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
              placeholder="John Doe"
              className="input-field"
            />
          </FormField>

          <FormField label="Employee ID">
            <input
              type="text"
              value={form.employee_id}
              onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              placeholder="EMP-001"
              className="input-field"
            />
          </FormField>
        </div>

        <FormField label="Email *">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            placeholder="john.doe@company.com"
            className="input-field"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Department">
            <input
              type="text"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="Engineering"
              className="input-field"
            />
          </FormField>

          <FormField label="Location">
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Building A"
              className="input-field"
            />
          </FormField>
        </div>

        <FormField label="Manager">
          <input
            type="text"
            value={form.manager}
            onChange={(e) => setForm({ ...form, manager: e.target.value })}
            placeholder="Manager name"
            className="input-field"
          />
        </FormField>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Saving...' : (employee ? 'Update' : 'Add Employee')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EmployeeAssetsModal({ employee, onClose }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await employeesAPI.getAssets(employee.id);
      setAssets(response.data);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`${employee.full_name}'s Assets`} onClose={onClose}>
      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading...</div>
      ) : assets.length === 0 ? (
        <div className="text-center py-8 text-slate-500">No assets assigned</div>
      ) : (
        <div className="space-y-2">
          {assets.map(asset => (
            <div key={asset.id} className="p-3 bg-dark-200/50 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{asset.name}</p>
                <p className="text-xs text-slate-500">{asset.asset_tag} • {asset.asset_type}</p>
              </div>
              <span className="text-xs text-slate-500">{asset.serial_number}</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={onClose} className="btn-secondary w-full mt-4">Close</button>
    </Modal>
  );
}

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
