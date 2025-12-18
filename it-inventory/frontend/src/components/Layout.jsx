import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Package, Monitor, Users, Shield, Wrench, Archive,
  Settings, LogOut, Plus, Upload, Download, Menu, X
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: Monitor, label: 'Dashboard' },
  { path: '/inventory', icon: Package, label: 'Inventory' },
  { path: '/employees', icon: Users, label: 'Employees' },
  { path: '/warranties', icon: Shield, label: 'Warranties' },
  { path: '/repairs', icon: Wrench, label: 'Repairs' },
  { path: '/decommissioned', icon: Archive, label: 'Decommissioned' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-200 via-dark-100 to-dark-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-200/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Package size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">IT Asset Manager</h1>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Inventory Control</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/inventory?action=add')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all"
            >
              <Plus size={18} />
              Add Asset
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user?.full_name}</p>
                <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className={`${sidebarOpen ? 'w-56' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-slate-700/50 min-h-[calc(100vh-73px)]`}>
          <div className="p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-blue-500/15 text-blue-400'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                  }`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}

            <div className="pt-4 mt-4 border-t border-slate-700/50">
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-blue-500/15 text-blue-400'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                  }`
                }
              >
                <Settings size={18} />
                Settings
              </NavLink>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
