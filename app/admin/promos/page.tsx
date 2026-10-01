'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, X, Check, ToggleLeft, ToggleRight } from 'lucide-react';

interface PromoCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses: number;
  usedCount: number;
  minBookingAmount: number;
  expiresAt: string;
  active: boolean;
  createdAt: string;
}

const emptyForm = {
  code: '', discountType: 'percentage' as const, discountValue: 10,
  maxUses: 100, minBookingAmount: 0, expiresAt: '', active: true,
};

export default function AdminPromosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return; }
    if (status === 'authenticated' && (session.user as any).role !== 'admin') { router.push('/'); return; }
  }, [status, session, router]);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/promo')
      .then(r => r.json())
      .then(d => { setPromos(d.promos || []); setLoading(false); });
  };

  useEffect(() => { if (status === 'authenticated') load(); }, [status]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditId(null);
    setModal('create');
  };

  const openEdit = (p: PromoCode) => {
    setForm({
      code: p.code, discountType: p.discountType as any, discountValue: p.discountValue,
      maxUses: p.maxUses, minBookingAmount: p.minBookingAmount,
      expiresAt: p.expiresAt ? p.expiresAt.slice(0, 10) : '', active: p.active,
    });
    setEditId(p.id);
    setModal('edit');
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, expiresAt: new Date(form.expiresAt).toISOString() };
    const url = modal === 'edit' ? `/api/admin/promo/${editId}` : '/api/admin/promo';
    const method = modal === 'edit' ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { setModal(null); load(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/promo/${id}`, { method: 'DELETE' });
    setDeleteId(null);
    load();
  };

  const toggleActive = async (p: PromoCode) => {
    await fetch(`/api/admin/promo/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !p.active }),
    });
    load();
  };

  const isExpired = (date: string) => new Date(date) < new Date();

  return (
    <div className="min-h-screen bg-gray-50 pt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Promo Codes</h1>
          <button onClick={openCreate} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
            <Plus className="h-4 w-4" /> Add Promo
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" /></div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Code', 'Discount', 'Min Amount', 'Uses', 'Expires', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {promos.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium">{p.code}</td>
                      <td className="px-4 py-3">
                        {p.discountType === 'percentage' ? `${p.discountValue}%` : `$${p.discountValue}`}
                      </td>
                      <td className="px-4 py-3">${p.minBookingAmount}</td>
                      <td className="px-4 py-3">{p.usedCount} / {p.maxUses}</td>
                      <td className="px-4 py-3">
                        <span className={isExpired(p.expiresAt) ? 'text-red-500' : 'text-gray-700'}>
                          {new Date(p.expiresAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleActive(p)} className="flex items-center gap-1 text-xs">
                          {p.active && !isExpired(p.expiresAt)
                            ? <><ToggleRight className="h-5 w-5 text-green-500" /><span className="text-green-600">Active</span></>
                            : <><ToggleLeft className="h-5 w-5 text-gray-400" /><span className="text-gray-500">{isExpired(p.expiresAt) ? 'Expired' : 'Inactive'}</span></>
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {promos.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No promo codes yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-lg">{modal === 'create' ? 'Add Promo Code' : 'Edit Promo Code'}</h2>
              <button onClick={() => setModal(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
                <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Discount Type</label>
                  <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value as any }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Discount Value</label>
                  <input type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max Uses</label>
                  <input type="number" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Min Booking ($)</label>
                  <input type="number" value={form.minBookingAmount} onChange={e => setForm(f => ({ ...f, minBookingAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Expires At</label>
                <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="rounded" />
                <label htmlFor="active" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2">
                {saving ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <Check className="h-4 w-4" />}
                {modal === 'create' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold mb-2">Delete Promo Code?</h3>
            <p className="text-sm text-gray-500 mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
