import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Order, StoreSettings } from '../store/useStore';
import { CheckCircle2, AlertCircle, Printer, Download } from 'lucide-react';
import html2canvas from 'html2canvas';

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
            custom_id: o.customers.custom_id,
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

  const downloadAsImage = async () => {
    const element = document.getElementById('invoice-print-area');
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 3, backgroundColor: '#ffffff' });
    const link = document.createElement('a');
    link.download = `invoice-${order?.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !order || !settings) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      <h1 className="text-2xl font-black text-slate-800">عذراً، الفاتورة غير موجودة</h1>
      <p className="text-slate-500 mt-2">يرجى التأكد من الرابط الصحيح.</p>
    </div>
  );

  const subtotal = order.items.reduce((sum, item) => sum + (item.quantity * item.sale_price), 0);
  const taxRate = settings.taxRate || 0;
  // If Tax exists: Total = (Subtotal - Discount) * (1 + TaxRate)
  // Discount = Subtotal - (Total / (1 + TaxRate))
  const calculatedDiscount = Math.max(0, subtotal - (order.total / (1 + (taxRate / 100))));
  const taxValue = (subtotal - calculatedDiscount) * (taxRate / 100);
  const isPayment = order.type === 'payment';

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 font-sans flex flex-col items-center gap-6" dir="rtl">
      
      {/* Action Buttons */}
      <div className="flex gap-4 no-print">
         <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-slate-900 transition">
            <Printer size={20} /> طباعة
         </button>
         <button onClick={downloadAsImage} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition">
            <Download size={20} /> حفظ كصورة
         </button>
      </div>

      {/* Invoice Area - Styled to match A5 Print */}
      <div id="invoice-print-area" className="bg-white w-full max-w-[148mm] min-h-[210mm] shadow-2xl p-[12mm] flex flex-col relative border border-gray-200 rounded-sm">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b-4 border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-4">
            {settings.logo && <img src={settings.logo} alt="Logo" className="w-16 h-16 object-contain rounded-xl" />}
            <div>
              <h1 className="text-2xl font-black text-slate-800 leading-none">{settings.name}</h1>
              <div className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                {settings.address && <span>📍 {settings.address}<br/></span>}
                {settings.phone && <span>📞 {settings.phone}</span>}
                {settings.phone2 && <span> | {settings.phone2}</span>}
              </div>
            </div>
          </div>
          <div className="bg-slate-800 text-white px-5 py-2 rounded-lg font-black text-lg">
             {isPayment ? 'إيصال سداد' : 'فاتورة بيع'}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
           <div className="space-y-2">
              <div className="text-[13px] flex gap-2">
                <strong className="text-slate-500">اسم العميل:</strong>
                <span className="text-slate-800 font-bold">{order.customer?.name || 'عميل نقدي'}</span>
              </div>
              <div className="text-[13px] flex gap-2">
                <strong className="text-slate-500">رقم الهاتف:</strong>
                <span className="text-slate-800 font-bold font-mono">{order.customer?.phone || '-'}</span>
              </div>
           </div>
           <div className="space-y-2 text-left">
              <div className="text-[13px] flex gap-2 justify-end">
                <strong className="text-slate-500">:رقم الفاتورة</strong>
                <span className="text-slate-800 font-bold font-mono">#{order.id}</span>
              </div>
              {order.customer?.custom_id && (
                <div className="text-[13px] flex gap-2 justify-end">
                  <strong className="text-slate-500">:رقم الكارت (ID)</strong>
                  <span className="text-slate-800 font-bold font-mono">{order.customer.custom_id}</span>
                </div>
              )}
              <div className="text-[13px] flex gap-2 justify-end">
                <strong className="text-slate-500">:التاريخ</strong>
                <span className="text-slate-800 font-bold">{new Date(order.date).toLocaleString('ar-SA')}</span>
              </div>
           </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-300">
              <th className="p-3 w-10 text-center text-slate-600 font-bold">#</th>
              <th className="p-3 text-right text-slate-600 font-bold">{isPayment ? 'البيان' : 'البيان / المنتج'}</th>
              {!isPayment && <th className="p-3 w-16 text-center text-slate-600 font-bold">الكمية</th>}
              <th className="p-3 w-24 text-center text-slate-600 font-bold">السعر</th>
              <th className="p-3 w-28 text-left text-slate-600 font-bold">الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.items.map((item, idx) => (
              <tr key={idx}>
                <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                <td className="p-3 font-bold text-slate-800">{item.name}</td>
                {!isPayment && <td className="p-3 text-center font-bold text-slate-800">{item.quantity}</td>}
                <td className="p-3 text-center font-bold text-slate-800">{item.sale_price.toFixed(2)}</td>
                <td className="p-3 text-left font-black text-slate-800">{(item.quantity * item.sale_price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary Section */}
        <div className="mr-auto w-3/5 mt-auto">
          {!isPayment && (
            <>
              <div className="flex justify-between py-2 border-b border-slate-50 text-[13px]">
                 <span className="text-slate-500 font-bold">المجموع الفرعي:</span>
                 <span className="text-slate-800 font-bold">{subtotal.toFixed(2)} {settings.currency}</span>
              </div>
              {calculatedDiscount > 0.5 && (
                <div className="flex justify-between py-2 border-b border-slate-50 text-[13px] text-red-500 font-bold">
                   <span>🏷️ الخصم:</span>
                   <span>- {calculatedDiscount.toFixed(2)} {settings.currency}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between py-2 border-b border-slate-50 text-[13px]">
                   <span className="text-slate-500 font-bold">الضريبة ({taxRate}%):</span>
                   <span className="text-slate-800 font-bold">{taxValue.toFixed(2)} {settings.currency}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-t-2 border-slate-800 mt-1 font-black text-lg text-slate-800">
                 <span>الإجمالي النهائي:</span>
                 <span>{order.total.toFixed(2)} {settings.currency}</span>
              </div>
            </>
          )}

          {/* Payment Status Box */}
          <div className={`mt-4 p-4 rounded-xl border text-center font-bold text-sm ${order.paid_amount < order.total ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
             {order.paid_amount < order.total ? (
               <div className="space-y-1">
                 <div className="text-lg">متبقي للتحصيل (آجل): {(order.total - order.paid_amount).toFixed(2)} {settings.currency}</div>
                 <div className="text-xs opacity-70">تم سداد: {order.paid_amount.toFixed(2)} {settings.currency}</div>
               </div>
             ) : (
               <div className="flex items-center justify-center gap-2 text-lg">
                 <CheckCircle2 size={22} /> ✓ تم سداد الفاتورة بالكامل
               </div>
             )}
          </div>

          {/* Payment Breakdown */}
          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
             <div className="text-[10px] text-slate-400 font-bold border-b border-slate-200 pb-1 mb-1 text-right">تفاصيل الدفع:</div>
             {order.paid_cash > 0 && <div className="flex justify-between text-[11px] font-bold"><span>💵 كاش:</span><span>{order.paid_cash.toFixed(2)}</span></div>}
             {order.paid_visa > 0 && <div className="flex justify-between text-[11px] font-bold"><span>💳 فيزا:</span><span>{order.paid_visa.toFixed(2)}</span></div>}
             {order.paid_wallet > 0 && <div className="flex justify-between text-[11px] font-bold"><span>📱 محفظة:</span><span>{order.paid_wallet.toFixed(2)}</span></div>}
             {order.paid_instapay > 0 && <div className="flex justify-between text-[11px] font-bold"><span>⚡ انستا باي:</span><span>{order.paid_instapay.toFixed(2)}</span></div>}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-6 border-t border-dashed border-slate-300 text-xs text-slate-400 font-bold italic">
           شكراً لثقتكم بنا - {settings.name} ترحب بكم دائماً
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; padding: 0; }
          .no-print { display: none; }
          .min-h-screen { background: white; padding: 0; min-height: auto; }
          #invoice-print-area { box-shadow: none; border: none; padding: 10mm; margin: 0 auto; width: 148mm; height: 210mm; }
        }
      `}</style>
    </div>
  );
}
