import React from 'react';
import { LayoutDashboard, Camera, UserPlus, FileSpreadsheet, Users } from 'lucide-react';

export default function Navbar({ activePage, setActivePage, isDbConnected = true }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Mark Attendance', icon: Camera },
    { id: 'register', label: 'Register Student', icon: UserPlus },
    { id: 'reports', label: 'Reports & Defaulters', icon: FileSpreadsheet },
    { id: 'students', label: 'Student Directory', icon: Users },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-[#E7E0D3] sticky top-0 z-50 px-4 py-3 mb-6 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* University Brand Header */}
        <div className="flex items-center gap-3.5">
          <img src="/itm_logo.png" alt="ITM SLS Baroda University" className="h-11 w-auto object-contain border border-[#E7E0D3] p-1 rounded-lg bg-white shadow-xs" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-[#0F172A] tracking-tight">ITM SLS BARODA UNIVERSITY</h1>
              <span className="text-[11px] bg-[#FDE8E8] text-[#8B1E1E] border border-[#F8B4B4] px-2 py-0.5 rounded-full font-bold">
                CSE(AI) Class 4
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              JavaScript Framework (PBL) - C2620A3 • Smart Face Attendance
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-[#FAF6EE] p-1.5 rounded-xl border border-[#E7E0D3]">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#8B1E1E] text-white shadow-md shadow-[#8B1E1E]/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-[#F2ECE1]'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* System & DB Status Pill */}
        <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 bg-[#FAF6EE] px-2.5 py-1 rounded-full border border-[#E7E0D3]">
            <span className={`h-2 w-2 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="font-semibold text-slate-700">MongoDB: {isDbConnected ? 'Connected' : 'Offline'}</span>
          </div>
          <div className="text-right">
            <p className="text-slate-800 font-bold">Vishakha &amp; Jithendar</p>
            <p className="text-[10px] text-slate-500 font-mono">24C22075 • 24C22074</p>
          </div>
        </div>
      </div>
    </header>
  );
}
