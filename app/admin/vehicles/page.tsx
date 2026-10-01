'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, X, Check, CalendarDays, CheckCircle2, XCircle } from 'lucide-react';

interface Vehicle {
  id: string;
  name: string;
  category: string;
  image: string;
  pricePerHour: number;
  minimumHours: number;
  passengers: number;
  luggage: number;
  description: string;
  features: string[];
  available: boolean;
}

interface AvailabilityVehicle {
  id: string;
  name: string;
  category: string;
  available: boolean;
  isAvailableOnDate: boolean;
  bookingsOnDate: { reference: string; time: string; status: string; guestName?: string; user?: { name: string } }[];
}

const empty: Omit<Vehicle, 'id'> = {
  name: '', category: '', image: '', pricePerHour: 0,
  minimumHours: 1, passengers: 1, luggage: 1, description: '', features: [], available: true,
};

export default function AdminVehiclesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'fleet' | 'availability'>('fleet');
  const [availDate, setAvailDate] = useState(new Date().toISOString().split('T')[0]);
  const [availData, setAvailData] = useState<AvailabilityVehicle[]>([]);
  const [availLoading, setAvailLoading] = useState(false);

  const loadAvailability = (date: string) => {
    setAvailLoading(true);
    fetch(`/api/admin/vehicles/availability?date=${date}`)
      .then(r => r.json())
      .then(d => setAvailData(d.vehicles || []))
      .finally(() => setAvailLoading(false));
  };

  useEffect(() => {
    if (tab === 'availability') loadAvailability(availDate);
  }, [tab, availDate]);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<Omit<Vehicle, 'id'>>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [featuresInput, setFeaturesInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return; }
    if (status === 'authenticated' && (session.user as any).role !== 'admin') { router.push('/'); return; }
  }, [status, session, router]);

  const load = () => {
    setLoading(true);
    fetch('/api/vehicles?all=true')
      .then(r => r.json())
      .then(d => { setVehicles(d.vehicles || []); setLoading(false); });
  };

  useEffect(() => { if (status === 'authenticated') load(); }, [status]);

  const openCreate = () => {
    setForm(empty);
    setFeaturesInput('');
    setEditId(null);
    setModal('create');
  };

  const openEdit = (v: Vehicle) => {
    setForm({ name: v.name, category: v.category, image: v.image, pricePerHour: v.pricePerHour, minimumHours: v.minimumHours ?? 1, passengers: v.passengers, luggage: v.luggage, description: v.description, features: v.features, available: v.available });
    setFeaturesInput(v.features.join(', '));
    setEditId(v.id);
    setModal('edit');
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, features: featuresInput.split(',').map(f => f.trim()).filter(Boolean) };
    const url = modal === 'edit' ? `/api/vehicles/${editId}` : '/api/vehicles';
    const method = modal === 'edit' ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { setModal(null); load(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
    setDeleteId(null);
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
      <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Vehicles</h1>
            <div className="flex bg-gray-100 rounded-lg p-1 text-sm">
              <button onClick={() => setTab('fleet')} className={`px-3 py-1.5 rounded-md font-medium transition-colors ${tab === 'fleet' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}>Fleet</button>
              <button onClick={() => setTab('availability')} className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${tab === 'availability' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}>
                <CalendarDays className="h-3.5 w-3.5" /> Availability
              </button>
            </div>
          </div>
          {tab === 'fleet' && (
            <button onClick={openCreate} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
              <Plus className="h-4 w-4" /> Add Vehicle
            </button>
          )}
        </div>

        {tab === 'fleet' && (
          <>
            {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" /></div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Image', 'Name', 'Category', 'Price/hr', 'Passengers', 'Luggage', 'Available', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vehicles.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <img src={v.image} alt={v.name} className="h-10 w-16 object-cover rounded" onError={e => { (e.target as HTMLImageElement).src = '/logo.png'; }} />
                      </td>
                      <td className="px-4 py-3 font-medium">{v.name}</td>
                      <td className="px-4 py-3 text-gray-500">{v.category}</td>
                      <td className="px-4 py-3">${v.pricePerHour.toFixed(2)}</td>
                      <td className="px-4 py-3">{v.passengers}</td>
                      <td className="px-4 py-3">{v.luggage}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${v.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {v.available ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(v)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => setDeleteId(v.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
          </>
        )}

        {tab === 'availability' && (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm font-medium text-gray-600">Check date:</label>
              <input
                type="date"
                value={availDate}
                onChange={e => setAvailDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
              />
              <span className="text-xs text-gray-400">
                {availData.filter(v => v.isAvailableOnDate && v.available).length} available · {availData.filter(v => !v.isAvailableOnDate || !v.available).length} unavailable
              </span>
            </div>

            {availLoading ? (
              <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" /></div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Vehicle', 'Category', 'Fleet Status', 'On This Date', 'Bookings'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {availData.map(v => (
                        <tr key={v.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{v.name}</td>
                          <td className="px-4 py-3 text-gray-500">{v.category}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${v.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {v.available ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {!v.available ? (
                              <span className="flex items-center gap-1 text-xs text-gray-400"><XCircle className="h-4 w-4" /> Disabled</span>
                            ) : v.isAvailableOnDate ? (
                              <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle2 className="h-4 w-4" /> Available</span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-red-500 font-medium"><XCircle className="h-4 w-4" /> Booked</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {v.bookingsOnDate.length === 0 ? (
                              <span className="text-gray-400 text-xs">—</span>
                            ) : (
                              <div className="space-y-1">
                                {v.bookingsOnDate.map((b, i) => (
                                  <div key={i} className="text-xs flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-gray-600">{b.reference}</span>
                                    <span className="text-gray-700 font-medium">{b.time} → {(b as any).endTime}</span>
                                    <span className="text-gray-400">({Math.round((b as any).duration / 60 * 10) / 10}h)</span>
                                    <span className="text-gray-500">{(b as any).customer}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                                      b.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                      b.status === 'assigned' ? 'bg-purple-100 text-purple-700' :
                                      b.status === 'in_progress' ? 'bg-orange-100 text-orange-700' :
                                      'bg-yellow-100 text-yellow-700'
                                    }`}>{b.status}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-lg">{modal === 'create' ? 'Add Vehicle' : 'Edit Vehicle'}</h2>
              <button onClick={() => setModal(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {[
                { label: 'Name', key: 'name', type: 'text' },
                { label: 'Category', key: 'category', type: 'text' },
                { label: 'Image URL', key: 'image', type: 'text' },
                { label: 'Price per hour ($)', key: 'pricePerHour', type: 'number' },
                { label: 'Minimum hours', key: 'minimumHours', type: 'number' },
                { label: 'Passengers', key: 'passengers', type: 'number' },
                { label: 'Luggage', key: 'luggage', type: 'number' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Features (comma-separated)</label>
                <input
                  type="text"
                  value={featuresInput}
                  onChange={e => setFeaturesInput(e.target.value)}
                  placeholder="WiFi, AC, Leather seats"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="available" checked={form.available} onChange={e => setForm(f => ({ ...f, available: e.target.checked }))} className="rounded" />
                <label htmlFor="available" className="text-sm text-gray-700">Available for booking</label>
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
            <h3 className="font-semibold mb-2">Delete Vehicle?</h3>
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
