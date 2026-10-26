import React from 'react';

export default function StatCard({ title, value, icon: Icon, subtitle, badgeText, badgeColor = 'emerald' }) {
  const badgeStyles = {
    emerald: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
    red: 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]',
    blue: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
    amber: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
  };

  return (
    <div className="glass-card p-5 relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{title}</p>
          <h3 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-slate-500 font-medium mt-1.5">{subtitle}</p>}
        </div>
        <div className="p-3 rounded-xl bg-[#FAF6EE] border border-[#E7E0D3] text-[#8B1E1E] group-hover:bg-[#8B1E1E] group-hover:text-white transition-all shadow-xs">
          {Icon && <Icon size={22} />}
        </div>
      </div>
      {badgeText && (
        <div className="mt-3.5">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeStyles[badgeColor] || badgeStyles.emerald}`}>
            {badgeText}
          </span>
        </div>
      )}
    </div>
  );
}
