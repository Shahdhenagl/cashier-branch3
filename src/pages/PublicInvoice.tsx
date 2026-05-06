import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Order, StoreSettings } from '../store/useStore';
import { ShoppingCart, MapPin, Phone, CheckCircle2 } from 'lucide-react';

export default function PublicInvoice() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [orderRes, settingsRes] = await Promise.all([
          supabase.from('orders').select('*, customers(*), order_items(*, products(*))').eq('id', id).maybeSingle(),
          supabase.from('store_settings').select('*').maybeSingle()
        ]);

        if (orderRes.error) throw orderRes.error;
        if (!orderRes.data) throw new Error('Invoice not found');

        const o = orderRes.data;
        const itemRows = (o.order_items as any[]) ?? [];
        const items = itemRows.map((i: any) => ({
          id: i.product_id,
          name: i.product_name || i.products?.name || 'منتج غير معروف',
          quantity: i.quantity,
          sale_price: i.sale_price,
          returned_quantity: i.returned_quantity || 0,
        }));

        setOrder({
          id: o.id,
          total: o.total,
          paid_amount: o.paid_amount,
          paid_cash: o.paid_cash,
          paid_visa: o.paid_visa,
          paid_wallet: o.paid_wallet,
          paid_instapay: o.paid_instapay,
          type: o.type,
          payment_method: o.payment_method,
          date: o.created_at,
          items,
          customer: o.customers ? { 
            id: o.customers.id, 
            name: o.customers.name, 
            phone: o.customers.phone, 
            timestamp: o.customers.created_at 
          } : undefined
        } as any);

        if (settingsRes.data) {
          const s = settingsRes.data;
          setSettings({
            name: s.name,
            currency: s.currency,
            logo: s.logo,
            taxRate: s.tax_rate,
            themeColor: s.theme_color,
            address: s.address,
            phone: s.phone,
            phone2: s.phone2,
            whatsappCountryCode: s.whatsapp_country_code,
            initial_balance: s.initial_balance
          });
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchData();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !order) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      <h1 className="text-2xl font-black text-slate-800">عذراً، الفاتورة غير موجودة</h1>
      <p className="text-slate-500 mt-2">يرجى التأكد من الرابط الصحيح.</p>
    </div>
  );

  const themeColor = settings?.themeColor || '#4f46e5';

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 font-sans" dir="rtl">
      <div className="max-w-md mx-auto bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-100 relative">
        
        {/* Header Decor */}
        <div className="h-32 relative flex items-center justify-center" style={{ background: themeColor }}>
           <div className="absolute inset-0 bg-black/10"></div>
           <div className="relative text-center">
              {settings?.logo && <img src={settings.logo} alt="Logo" className="w-16 h-16 rounded-2xl bg-white p-1 mx-auto mb-2 shadow-lg" />}
              <h1 className="text-xl font-black text-white">{settings?.name}</h1>
           </div>
        </div>

        <div className="p-8 -mt-6 bg-white rounded-t-[40px] relative">
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-50 text-emerald-600 px-6 py-2 rounded-full font-black text-sm flex items-center gap-2 border border-emerald-100">
               <CheckCircle2 size={18} />
               فاتورة مدفوعة
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">رقم الفاتورة</span>
                <span className="text-lg font-black text-slate-800 font-mono tracking-tighter">#{order.id}</span>
              </div>
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">التاريخ</span>
                <span className="text-sm font-bold text-slate-800">{new Date(order.date).toLocaleDateString('ar-SA')}</span>
              </div>
            </div>

            {/* Customer Section */}
            {order.customer && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
                <div className="bg-white p-3 rounded-xl shadow-sm text-indigo-600">
                   <Phone size={20} />
                </div>
                <div>
                   <span className="text-[10px] font-bold text-slate-400 block mb-0.5">العميل</span>
                   <h3 className="font-black text-slate-800">{order.customer.name}</h3>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="space-y-4">
               <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <ShoppingCart size={14} /> تفاصيل الطلب
               </h4>
               <div className="space-y-3">
                 {order.items.map((item, idx) => (
                   <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 pb-3 last:border-0">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{item.name}</span>
                        <span className="text-xs text-slate-400">الكمية: {item.quantity} × {item.sale_price.toFixed(2)}</span>
                      </div>
                      <span className="font-black text-slate-800">{(item.quantity * item.sale_price).toFixed(2)}</span>
                   </div>
                 ))}
               </div>
            </div>

            {/* Totals */}
            <div className="bg-indigo-600 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden mt-8" style={{ background: themeColor }}>
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
               <div className="relative flex justify-between items-center mb-4">
                 <span className="font-bold opacity-80">الإجمالي</span>
                 <span className="text-3xl font-black">{order.total.toFixed(2)} <span className="text-xs">{settings?.currency}</span></span>
               </div>
               <div className="relative pt-4 border-t border-white/20 flex justify-between items-center text-sm">
                 <span className="font-bold opacity-80 underline underline-offset-4 decoration-white/30">المبلغ المدفوع</span>
                 <span className="font-black text-lg">{order.paid_amount.toFixed(2)}</span>
               </div>
            </div>

            {/* Store Info */}
            <div className="pt-8 space-y-4 border-t border-slate-100 text-center">
               <p className="text-sm font-bold text-slate-500 italic">شكراً لثقتكم بنا، نتمنى رؤيتكم مرة أخرى!</p>
               <div className="flex flex-wrap justify-center gap-4 text-[10px] font-black text-slate-400">
                  {settings?.address && <div className="flex items-center gap-1.5"><MapPin size={12} /> {settings.address}</div>}
                  {settings?.phone && <div className="flex items-center gap-1.5"><Phone size={12} /> {settings.phone}</div>}
               </div>
            </div>
          </div>
        </div>
        
        {/* Footer Accent */}
        <div className="h-2 w-full" style={{ background: themeColor }}></div>
      </div>
    </div>
  );
}
