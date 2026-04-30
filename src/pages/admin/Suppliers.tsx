import { useState } from 'react';
import { useStore } from '../../store/useStore';
import type { PurchaseItem } from '../../store/useStore';
import { Users, Search, Plus, Edit2, Trash2, Phone, MapPin, Calendar, ShoppingCart, FileText, X, ChevronDown } from 'lucide-react';

export default function Suppliers() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, storeSettings, purchaseInvoices, addPurchaseInvoice, products } = useStore();
  const [activeTab, setActiveTab] = useState<'suppliers' | 'invoices'>('suppliers');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });

  // Invoice form state
  const [invSupplierId, setInvSupplierId] = useState('');
  const [invPaidAmount, setInvPaidAmount] = useState('');
  const [invItems, setInvItems] = useState<{ product_id: string; quantity: string; purchase_price: string }[]>([
    { product_id: '', quantity: '1', purchase_price: '' }
  ]);

  const filteredSuppliers = suppliers.filter(s =>
    s.name.includes(searchQuery) || (s.phone && s.phone.includes(searchQuery))
  );

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      await updateSupplier(editingSupplier.id, formData);
    } else {
      await addSupplier(formData);
    }
    setShowSupplierModal(false);
    setEditingSupplier(null);
    setFormData({ name: '', phone: '', address: '' });
  };

  const invTotal = invItems.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity || '0') * parseFloat(item.purchase_price || '0'));
  }, 0);

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invSupplierId) return alert('اختر المورد أولاً');
    const validItems = invItems.filter(i => i.product_id && parseFloat(i.quantity) > 0 && parseFloat(i.purchase_price) > 0);
    if (validItems.length === 0) return alert('أضف منتجاً واحداً على الأقل');

    setIsSaving(true);
    const items: PurchaseItem[] = validItems.map(i => ({
      product_id: i.product_id,
      quantity: parseInt(i.quantity),
      purchase_price: parseFloat(i.purchase_price),
    }));

    const invoiceNumber = `PO-${Date.now()}`;
    await addPurchaseInvoice({
      invoice_number: invoiceNumber,
      supplier_id: invSupplierId,
      total: invTotal,
      paid_amount: parseFloat(invPaidAmount) || 0,
    }, items);

    setIsSaving(false);
    setShowInvoiceModal(false);
    setInvSupplierId('');
    setInvPaidAmount('');
    setInvItems([{ product_id: '', quantity: '1', purchase_price: '' }]);
    setActiveTab('invoices');
  };

  const addInvRow = () => setInvItems([...invItems, { product_id: '', quantity: '1', purchase_price: '' }]);
  const removeInvRow = (idx: number) => setInvItems(invItems.filter((_, i) => i !== idx));
  const updateInvRow = (idx: number, field: string, value: string) => {
    const updated = invItems.map((item, i) => i === idx ? { ...item, [field]: value } : item);
    if (field === 'product_id' && value) {
      const prod = products.find(p => p.id === value);
      if (prod) updated[idx].purchase_price = String(prod.purchase_price || prod.average_purchase_price || '');
    }
    setInvItems(updated);
  };

  const tc = storeSettings.themeColor;

  return (
    <div className="p-8 h-[calc(100vh-2rem)] overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <Users style={{ color: tc }} size={32} />
            الموردين والمشتريات
          </h1>
          <p className="text-slate-500 mt-2 font-medium">إدارة الموردين وتسجيل فواتير الشراء</p>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'suppliers') {
              setEditingSupplier(null);
              setFormData({ name: '', phone: '', address: '' });
              setShowSupplierModal(true);
            } else {
              setShowInvoiceModal(true);
            }
          }}
          style={{ backgroundColor: tc }}
          className="text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:opacity-90 transition shadow-lg"
        >
          <Plus size={20} />
          {activeTab === 'suppliers' ? 'إضافة مورد جديد' : 'فاتورة مشتريات جديدة'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-100 rounded-2xl p-1.5 w-fit">
        <button
          onClick={() => setActiveTab('suppliers')}
          style={activeTab === 'suppliers' ? { backgroundColor: tc, color: 'white' } : {}}
          className={`px-6 py-2.5 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'suppliers' ? 'shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Users size={18} />
          الموردين ({suppliers.length})
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          style={activeTab === 'invoices' ? { backgroundColor: tc, color: 'white' } : {}}
          className={`px-6 py-2.5 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'invoices' ? 'shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <ShoppingCart size={18} />
          فواتير المشتريات ({purchaseInvoices.length})
        </button>
      </div>

      {/* ── Suppliers Tab ── */}
      {activeTab === 'suppliers' && (
        <>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 mb-6">
            <div className="relative">
              <Search className="absolute right-4 top-3.5 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="ابحث باسم المورد أو رقم الهاتف..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pr-12 pl-4 focus:outline-none focus:ring-2 transition text-slate-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map((supplier) => (
              <div key={supplier.id} className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all border border-slate-100 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-100 to-transparent rounded-bl-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
                <div className="flex justify-between items-start mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
                    <Users size={28} style={{ color: tc }} />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingSupplier(supplier); setFormData({ name: supplier.name, phone: supplier.phone || '', address: supplier.address || '' }); setShowSupplierModal(true); }}
                      className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition"
                    ><Edit2 size={16} /></button>
                    <button
                      onClick={() => { if (confirm('هل أنت متأكد من حذف هذا المورد؟')) deleteSupplier(supplier.id); }}
                      className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition"
                    ><Trash2 size={16} /></button>
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-4">{supplier.name}</h3>
                <div className="space-y-3 text-slate-600 text-sm font-medium">
                  <div className="flex items-center gap-3"><Phone size={16} className="text-slate-400" /><span dir="ltr" className="font-mono">{supplier.phone || 'لا يوجد هاتف'}</span></div>
                  <div className="flex items-center gap-3"><MapPin size={16} className="text-slate-400" /><span>{supplier.address || 'لا يوجد عنوان'}</span></div>
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-50">
                    <Calendar size={16} className="text-slate-400" />
                    <span className="text-xs text-slate-400">أضيف في: {new Date(supplier.created_at).toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>
              </div>
            ))}
            {filteredSuppliers.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-xl font-bold mb-2">لا يوجد موردين</p>
                <p className="text-sm">لم يتم العثور على أي مورد مسجل حالياً.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Invoices Tab ── */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {purchaseInvoices.length === 0 ? (
            <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-xl font-bold mb-2">لا توجد فواتير مشتريات</p>
              <p className="text-sm">اضغط على "فاتورة مشتريات جديدة" لإنشاء أول فاتورة.</p>
            </div>
          ) : (
            purchaseInvoices.map((inv) => {
              const supplier = suppliers.find(s => s.id === inv.supplier_id);
              const remaining = inv.total - inv.paid_amount;
              return (
                <div key={inv.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: tc + '20' }}>
                        <FileText size={22} style={{ color: tc }} />
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-lg">{inv.invoice_number}</p>
                        <p className="text-slate-500 text-sm font-medium">{supplier?.name || 'مورد محذوف'}</p>
                        <p className="text-slate-400 text-xs mt-1">{new Date(inv.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-800 text-xl">{inv.total.toLocaleString()} {storeSettings.currency}</p>
                      <p className="text-sm font-bold text-emerald-600 mt-1">مدفوع: {inv.paid_amount.toLocaleString()}</p>
                      {remaining > 0 && <p className="text-sm font-bold text-red-500">متبقي: {remaining.toLocaleString()}</p>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Supplier Modal ── */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-800">{editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}</h2>
              <button onClick={() => setShowSupplierModal(false)} className="p-2 rounded-xl hover:bg-slate-200 transition"><X size={20} /></button>
            </div>
            <form onSubmit={handleSupplierSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">اسم المورد أو الشركة <span className="text-red-500">*</span></label>
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">رقم الهاتف</label>
                <input type="text" dir="ltr" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium text-left" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">العنوان</label>
                <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium resize-none h-24" />
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="submit" style={{ backgroundColor: tc }} className="flex-1 text-white py-3.5 rounded-xl font-bold shadow-lg hover:opacity-90 transition">حفظ البيانات</button>
                <button type="button" onClick={() => setShowSupplierModal(false)} className="flex-1 bg-slate-100 text-slate-700 py-3.5 rounded-xl font-bold hover:bg-slate-200 transition">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Purchase Invoice Modal ── */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><ShoppingCart size={22} style={{ color: tc }} />فاتورة مشتريات جديدة</h2>
              <button onClick={() => setShowInvoiceModal(false)} className="p-2 rounded-xl hover:bg-slate-200 transition"><X size={20} /></button>
            </div>

            <form onSubmit={handleAddInvoice} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Supplier Select */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">المورد <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={invSupplierId} onChange={e => setInvSupplierId(e.target.value)} required className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium">
                      <option value="">-- اختر المورد --</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute left-4 top-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-bold text-slate-700">المنتجات المشتراة</label>
                    <button type="button" onClick={addInvRow} className="text-sm font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:opacity-80 transition" style={{ color: tc }}>
                      <Plus size={14} /> إضافة منتج
                    </button>
                  </div>
                  <div className="space-y-3">
                    {invItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-slate-50 rounded-2xl p-3 border border-slate-100">
                        <div className="relative flex-1">
                          <select value={item.product_id} onChange={e => updateInvRow(idx, 'product_id', e.target.value)} className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium">
                            <option value="">-- المنتج --</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <input
                          type="number" min="1" placeholder="الكمية"
                          value={item.quantity} onChange={e => updateInvRow(idx, 'quantity', e.target.value)}
                          className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium text-center"
                        />
                        <input
                          type="number" min="0" step="0.01" placeholder="سعر الشراء"
                          value={item.purchase_price} onChange={e => updateInvRow(idx, 'purchase_price', e.target.value)}
                          className="w-32 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium text-center"
                        />
                        {invItems.length > 1 && (
                          <button type="button" onClick={() => removeInvRow(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Paid Amount */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">المبلغ المدفوع للمورد</label>
                  <input type="number" min="0" step="0.01" placeholder={`الإجمالي: ${invTotal.toLocaleString()} ${storeSettings.currency}`} value={invPaidAmount} onChange={e => setInvPaidAmount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium" />
                </div>

                {/* Summary */}
                <div className="rounded-2xl p-4 border" style={{ backgroundColor: tc + '10', borderColor: tc + '30' }}>
                  <div className="flex justify-between font-bold text-slate-700 text-sm mb-1">
                    <span>إجمالي الفاتورة</span><span>{invTotal.toLocaleString()} {storeSettings.currency}</span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-600 font-bold">
                    <span>المدفوع</span><span>{parseFloat(invPaidAmount || '0').toLocaleString()}</span>
                  </div>
                  {invTotal - parseFloat(invPaidAmount || '0') > 0 && (
                    <div className="flex justify-between text-sm text-red-500 font-bold">
                      <span>المتبقي للمورد</span><span>{(invTotal - parseFloat(invPaidAmount || '0')).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex gap-3 flex-shrink-0">
                <button type="submit" disabled={isSaving} style={{ backgroundColor: tc }} className="flex-1 text-white py-3.5 rounded-xl font-bold shadow-lg hover:opacity-90 transition disabled:opacity-60">
                  {isSaving ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
                </button>
                <button type="button" onClick={() => setShowInvoiceModal(false)} className="flex-1 bg-slate-100 text-slate-700 py-3.5 rounded-xl font-bold hover:bg-slate-200 transition">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
