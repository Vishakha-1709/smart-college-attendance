import React, { useState, useEffect } from 'react';
import { Users, Search, Trash2, UserPlus, RefreshCw, CheckCircle2, AlertCircle, Database } from 'lucide-react';

export default function Students({ setActivePage }) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleDelete = async (id, rollNo) => {
    if (!window.confirm(`Are you sure you want to delete student ${rollNo} and their attendance history?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: data.message });
        setStudents(prev => prev.filter(s => s._id !== id));
      } else {
        setNotification({ type: 'error', message: data.message });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to delete student.' });
    }
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E0D3] pb-4">
        <div>
          <h2 className="text-2xl font-black text-[#0F172A] flex items-center gap-2.5">
            <Users className="text-[#8B1E1E]" size={26} />
            <span>Student Biometric Directory</span>
          </h2>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Manage enrolled students, review registered 128-d facial embeddings, and inspect active records in MongoDB.
          </p>
        </div>
        <button
          onClick={() => setActivePage('register')}
          className="btn-primary text-xs"
        >
          <UserPlus size={15} />
          <span>Enroll New Student</span>
        </button>
      </div>

      {/* Alert Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs font-bold underline opacity-75 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Search Bar & Counter */}
      <div className="glass-card p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by student name or roll number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#D5C9B8] text-[#0F172A] placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:border-[#8B1E1E] focus:ring-1 focus:ring-[#8B1E1E]"
          />
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
          <span>{filtered.length} of {students.length} Students</span>
          <button onClick={fetchStudents} className="btn-secondary text-xs p-2" title="Refresh student directory">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Student Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full py-14 text-center glass-card border-dashed">
            <Users className="mx-auto text-slate-400 mb-2" size={32} />
            <p className="text-base font-bold text-[#0F172A]">No students found</p>
            <p className="text-xs text-slate-500 mt-1">
              {search ? `No student records matching "${search}".` : 'No students enrolled in MongoDB yet. Click "Enroll New Student" to get started.'}
            </p>
          </div>
        ) : (
          filtered.map(s => (
            <div key={s._id} className="glass-card p-5 space-y-4 hover:border-[#8B1E1E]/40 transition-all flex flex-col justify-between">
              <div className="flex items-start gap-3.5">
                {s.photoSample ? (
                  <img
                    src={s.photoSample}
                    alt={s.name}
                    className="h-14 w-14 rounded-xl object-cover border border-[#E7E0D3] bg-[#F5EFE6] shrink-0 shadow-sm"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#8B1E1E] to-[#A91B1B] border border-[#8B1E1E] flex items-center justify-center font-bold text-lg text-white shrink-0 shadow-sm">
                    {s.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#8B1E1E] tracking-wider">
                      {s.rollNo}
                    </span>
                    <span className="text-[11px] font-semibold bg-[#F5EFE6] text-[#633B18] px-2 py-0.5 rounded border border-[#E0D4C3]">
                      {s.faceDescriptors ? s.faceDescriptors.length : 0} Vectors
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-[#0F172A] truncate mt-0.5">{s.name}</h4>
                  <p className="text-xs text-slate-600 font-medium truncate">{s.department}</p>
                  <p className="text-xs text-slate-500">{s.section} • Semester {s.semester}</p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-[#EAE3D5] flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Enrolled in MongoDB</span>
                </span>
                <button
                  onClick={() => handleDelete(s._id, s.rollNo)}
                  className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  title="Delete student and history"
                >
                  <Trash2 size={14} />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
