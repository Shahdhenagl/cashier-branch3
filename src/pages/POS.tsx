import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ShoppingCart, Search, Plus, Minus, Trash2, Banknote, RefreshCcw, Moon, Sun, ArrowRightLeft, X, Printer, CreditCard, Smartphone, Zap, LogOut } from 'lucide-react';
import { normalizeArabic } from '../utils/textUtils';


export default function POS() {
  const { products, categories, cart, addToCart, removeFromCart, updateQuantity, updatePrice, clearCart, checkout, processReturn, storeSettings, orders, activeInvoiceId, customers, activeCashier, logoutPOS } = useStore();
  const navigate = useNavigate();
  
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Customer details for checkout
  const [customerId, setCustomerId] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paidCash, setPaidCash] = useState('');
  const [paidVisa, setPaidVisa] = useState('');
  const [paidWallet, setPaidWallet] = useState('');
  const [paidInstapay, setPaidInstapay] = useState('');
  const [discountStr, setDiscountStr] = useState('');
  const [customerDebt, setCustomerDebt] = useState<number>(0);
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showReturnsModal, setShowReturnsModal] = useState(false);
  const [returnSearchQuery, setReturnSearchQuery] = useState('');
  const [activeReturnOrder, setActiveReturnOrder] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastInvoiceId, setLastInvoiceId] = useState('');
  const [lastCustomerInfo, setLastCustomerInfo] = useState<any>(null);
  const [lastOrderDetails, setLastOrderDetails] = useState<any>(null);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [shouldPrint, setShouldPrint] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleSearchOrder = () => {
    const order = orders.find(o => o.id.toLowerCase() === returnSearchQuery.toLowerCase());
    if (order) {
      setActiveReturnOrder(order);
    } else {
      alert("لم يتم العثور على فاتورة بهذا الرقم");
      setActiveReturnOrder(null);
    }
  };

  const handleReturnItem = async (productId: string) => {
    if (activeReturnOrder) {
      const qs = prompt("أدخل الكمية المراد استرجاعها:");
      const qty = parseInt(qs || '0', 10);
      if (!isNaN(qty) && qty > 0) {
        const success = await processReturn(activeReturnOrder.id, productId, qty);
        if (success) {
          alert('تم استرجاع المنتجات بنجاح وإعادتها للمخزون');
          const updatedOrder = useStore.getState().orders.find(o => o.id === activeReturnOrder.id);
          setActiveReturnOrder(updatedOrder);
        } else {
          alert("الكمية غير صحيحة أو تم استرجاعها مسبقاً بالكامل");
        }
      }
    }
  };

  const printInvoice = (invId: string, orderDetails: any) => {
    const currentSettings = { ...storeSettings };
    const printDate = new Date().toLocaleString('ar-SA');
    const itemsHtml = orderDetails.cart.map((item: any, index: number) =>
      `<tr>
        <td style="padding:10px 4px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;color:#666;">${index + 1}</td>
        <td style="padding:10px 4px;border-bottom:1px solid #eee;font-weight:900;font-size:14px;">${item.name}</td>
        <td style="padding:10px 4px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;">${item.quantity}</td>
        <td style="padding:10px 4px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;">${item.sale_price.toFixed(2)}</td>
        <td style="padding:10px 4px;border-bottom:1px solid #eee;text-align:left;font-weight:black;font-size:15px;">${(item.sale_price * item.quantity).toFixed(2)}</td>
      </tr>`
    ).join('');

    const customerBlock = (orderDetails.customerName || orderDetails.customerPhone || orderDetails.customId)
      ? `<div class="customer-info-grid">
          <div class="info-item"><strong>اسم العميل:</strong> <span>${orderDetails.customerName || '—'}</span></div>
          <div class="info-item"><strong>رقم الكارت (ID):</strong> <span dir="ltr">${orderDetails.customId || orderDetails.customerId?.substring(0, 8) || '—'}</span></div>
          <div class="info-item"><strong>رقم الهاتف:</strong> <span dir="ltr">${orderDetails.customerPhone || '—'}</span></div>
          <div class="info-item"><strong>رقم الفاتورة:</strong> <span>#${invId}</span></div>
          <div class="info-item"><strong>التاريخ:</strong> <span>${printDate}</span></div>
         </div>`
      : `<div class="customer-info-grid">
          <div class="info-item"><strong>اسم العميل:</strong> <span>عميل نقدي</span></div>
          <div class="info-item"><strong>رقم الفاتورة:</strong> <span>#${invId}</span></div>
          <div class="info-item"><strong>التاريخ:</strong> <span>${printDate}</span></div>
         </div>`;

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<title>فاتورة بيع #${invId}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Cairo', sans-serif;}
  body{background:#fff;color:#1e293b;padding:0;margin:0;}
  .invoice-container{width:148mm;min-height:210mm;margin:0 auto;padding:12mm;position:relative;display:flex;flex-direction:column;}
  
  .header-main{display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #1e293b;padding-bottom:15px;margin-bottom:20px;}
  .store-identity{display:flex;align-items:center;gap:15px;}
  .logo{width:70px;height:70px;object-fit:contain;border-radius:12px;}
  .store-name{font-size:24px;font-weight:900;color:#1e293b;line-height:1;}
  .store-details{font-size:11px;color:#64748b;margin-top:5px;line-height:1.5;}
  
  .invoice-title-badge{background:#1e293b;color:#fff;padding:8px 20px;border-radius:8px;font-weight:900;font-size:18px;}
  
  .customer-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:25px;background:#f8fafc;padding:15px;border-radius:12px;border:1px solid #e2e8f0;}
  .info-item{font-size:13px;display:flex;gap:8px;}
  .info-item strong{color:#64748b;white-space:nowrap;}
  .info-item span{color:#1e293b;font-weight:700;}
  
  table{width:100%;border-collapse:collapse;margin-bottom:20px;}
  thead th{background:#f1f5f9;color:#475569;font-size:13px;padding:12px 8px;text-align:center;border-bottom:2px solid #cbd5e1;}
  thead th:nth-child(2){text-align:right;}
  thead th:last-child{text-align:left;}
  
  .summary-section{margin-right:auto;width:60%;margin-top:auto;}
  .summary-row{display:flex;justify-content:space-between;padding:8px 0;font-size:14px;border-bottom:1px solid #f1f5f9;}
  .summary-row.total{border-top:2px solid #1e293b;border-bottom:none;margin-top:5px;font-size:20px;font-weight:900;color:#1e293b;}
  
  .payment-status{margin-top:15px;padding:10px;border-radius:8px;text-align:center;font-weight:bold;font-size:14px;}
  .status-paid{background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;}
  .status-debt{background:#fef2f2;color:#dc2626;border:1px solid #fecaca;}
  .payment-method-badge{margin-top:10px;padding:8px 14px;border-radius:8px;display:inline-flex;align-items:center;gap:8px;font-weight:900;font-size:14px;background:#f0f4ff;color:#4f46e5;border:1px solid #c7d2fe;}
  
  .footer{text-align:center;margin-top:30px;padding-top:15px;border-top:1px dashed #cbd5e1;font-size:12px;color:#94a3b8;font-weight:bold;}
  
  @media print{
    @page{size:A5;margin:0;}
    body{-webkit-print-color-adjust:exact;}
    .invoice-container{width:148mm;height:210mm;padding:10mm;}
  }
</style>
</head>
<body>
<div class="invoice-container">
  <div class="header-main">
    <div class="store-identity">
      <img class="logo" src="${currentSettings.logo}" onerror="this.style.display='none'" />
      <div>
        <div class="store-name">${currentSettings.name}</div>
        <div class="store-details">
          ${currentSettings.address ? `📍 ${currentSettings.address}<br/>` : ''}
          ${currentSettings.phone ? `📞 ${currentSettings.phone}` : ''}
          ${currentSettings.phone2 ? ` | ${currentSettings.phone2}` : ''}
        </div>
      </div>
    </div>
    <div class="invoice-title-badge">فاتورة بيع</div>
  </div>

  ${customerBlock}
  <div style="font-size:11px; color:#64748b; margin-bottom:15px; text-align:right;">المسؤول عن الفاتورة: <strong>${activeCashier?.name || 'غير معروف'}</strong></div>

  <table>
    <thead><tr>
      <th style="width:40px">#</th>
      <th style="text-align:right">البيان / المنتج</th>
      <th style="width:60px">الكمية</th>
      <th style="width:80px">السعر</th>
      <th style="width:100px;text-align:left">الإجمالي</th>
    </tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>

    <div class="summary-section">
      <div class="summary-row"><span>المجموع الفرعي:</span><span>${orderDetails.subtotal.toFixed(2)} ${currentSettings.currency}</span></div>
      ${orderDetails.discount > 0 ? `<div class="summary-row" style="color:#e53e3e;font-weight:700;"><span>🏷️ الخصم:</span><span>- ${orderDetails.discount.toFixed(2)} ${currentSettings.currency}</span></div>` : ''}
      <div class="summary-row"><span>الضريبة (${currentSettings.taxRate}%):</span><span>${orderDetails.tax.toFixed(2)} ${currentSettings.currency}</span></div>
      <div class="summary-row total"><span>الإجمالي النهائي:</span><span>${orderDetails.total.toFixed(2)} ${currentSettings.currency}</span></div>
    
    ${(orderDetails.paidAmount !== undefined && orderDetails.paidAmount < orderDetails.total) ? `
      <div class="payment-status status-debt">
        <div>متبقي للتحصيل (آجل): ${(orderDetails.total - (orderDetails.paidAmount || 0)).toFixed(2)} ${currentSettings.currency}</div>
        <div style="font-size:11px;opacity:0.8;margin-top:2px;">تم سداد: ${(orderDetails.paidAmount || 0).toFixed(2)} ${currentSettings.currency}</div>
      </div>
    ` : `
      <div class="payment-status status-paid">✓ تم سداد الفاتورة بالكامل</div>
    `}
    <div style="margin-top:10px; padding:8px; background:#f9fafb; border-radius:8px; border:1px solid #eee;">
      <div style="font-size:11px; color:#64748b; margin-bottom:4px; border-bottom:1px solid #eee; padding-bottom:2px; text-align:right;">تفاصيل الدفع:</div>
      ${orderDetails.splitPayments.cash > 0 ? `<div class="summary-row" style="font-size:12px;"><span>💵 كاش:</span><span>${orderDetails.splitPayments.cash.toFixed(2)}</span></div>` : ''}
      ${orderDetails.splitPayments.visa > 0 ? `<div class="summary-row" style="font-size:12px;"><span>💳 فيزا:</span><span>${orderDetails.splitPayments.visa.toFixed(2)}</span></div>` : ''}
      ${orderDetails.splitPayments.wallet > 0 ? `<div class="summary-row" style="font-size:12px;"><span>📱 محفظة:</span><span>${orderDetails.splitPayments.wallet.toFixed(2)}</span></div>` : ''}
      ${orderDetails.splitPayments.instapay > 0 ? `<div class="summary-row" style="font-size:12px;"><span>⚡ انستا باي:</span><span>${orderDetails.splitPayments.instapay.toFixed(2)}</span></div>` : ''}
    </div>
  </div>

  <div class="footer">شكراً لثقتكم بنا - ${currentSettings.name} ترحب بكم دائماً</div>
</div>
<script>window.onload=()=>{setTimeout(()=>{window.print();window.onafterprint=()=>window.close();},500);}<\/script>
</body></html>`;

    const pw = window.open('', '_blank', 'width=800,height=1000');
    if (pw) {
      pw.document.write(html);
      pw.document.close();
    }
  };

  // Opens payment method modal before checkout
  const handleCheckoutClick = (shouldPrint: boolean) => {
    if (cart.length === 0) return;
    doCheckout(shouldPrint);
  };

  const doCheckout = async (shouldPrint: boolean) => {
    const currentCart = [...cart];
    const currentSubtotal = subtotal;
    const currentDiscount = discount;
    const currentTax = tax;
    const currentTotal = total;
    const currentCustomerName = customerName;
    const currentCustomerPhone = customerPhone;
    const currentCustomId = customerId;

    const splitPayments = {
      cash: parseFloat(paidCash) || 0,
      visa: parseFloat(paidVisa) || 0,
      wallet: parseFloat(paidWallet) || 0,
      instapay: parseFloat(paidInstapay) || 0
    };

    const finalPaidAmount = splitPayments.cash + splitPayments.visa + splitPayments.wallet + splitPayments.instapay;
    
    // If all fields are empty, assume full payment in cash
    const isAllEmpty = !paidCash && !paidVisa && !paidWallet && !paidInstapay;
    const effectivePaidAmount = isAllEmpty ? currentTotal : finalPaidAmount;
    const effectiveSplit = isAllEmpty ? { ...splitPayments, cash: currentTotal } : splitPayments;
    const primaryMethod = effectiveSplit.cash >= effectiveSplit.visa ? 'cash' : 'visa';

    if (effectivePaidAmount < currentTotal && (!currentCustomerName.trim() || !currentCustomerPhone.trim())) {
      alert("عذراً، يجب تسجيل اسم ورقم هاتف العميل بالكامل (الاسم والموبايل) في حالة البيع بالآجل لحفظ المديونية.");
      return;
    }

    const invoiceId = await checkout(currentTotal, { name: currentCustomerName, phone: currentCustomerPhone, custom_id: currentCustomId }, effectivePaidAmount, 'sale', primaryMethod, effectiveSplit);
    
    const details: any = {
      cart: currentCart,
      subtotal: currentSubtotal,
      discount: currentDiscount,
      tax: currentTax,
      total: currentTotal,
      paidAmount: effectivePaidAmount,
      splitPayments: effectiveSplit,
      customerName: currentCustomerName,
      customerPhone: currentCustomerPhone,
      customId: currentCustomId,
      paymentMethod: primaryMethod,
    };
    
    const actualCustomer = useStore.getState().customers.find(c => (currentCustomerPhone && c.phone === currentCustomerPhone) || (currentCustomId && c.custom_id === currentCustomId));
    details.customerId = actualCustomer?.id || '';
    details.customId = actualCustomer?.custom_id || currentCustomId;

    setLastInvoiceId(invoiceId);
    setLastCustomerInfo({ name: currentCustomerName, phone: currentCustomerPhone });
    setLastOrderDetails(details);
    setShowSuccessModal(true);

    if (shouldPrint) {
      printInvoice(invoiceId, details);
    }

    setCustomerName('');
    setCustomerPhone('');
    setCustomerId('');
    setPaidCash('');
    setPaidVisa('');
    setPaidWallet('');
    setPaidInstapay('');
    setDiscountStr('');
    setCustomerDebt(0);
    setShowCustomerSuggestions(false);
  };

  const filteredCustomers = customerName.trim() 
    ? customers.filter(c => {
        const normalizedName = normalizeArabic(c.name);
        const normalizedQuery = normalizeArabic(customerName);
        const customerIdShort = (c.custom_id || c.id.substring(0, 8)).toLowerCase();
        return (
          normalizedName.includes(normalizedQuery) || 
          c.phone.includes(customerName) ||
          customerIdShort.includes(customerName.toLowerCase())
        );
      })
    : [];



  const handleSelectCustomer = (customer: any) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setCustomerId(customer.custom_id || '');
    setShowCustomerSuggestions(false);
  };

  const filteredProducts = products.filter(
    (p) =>
      (activeCategory === 'all' || p.category_id === activeCategory) &&
      p.name.includes(searchQuery)
  );

  const subtotal = cart.reduce((sum, item) => sum + item.sale_price * item.quantity, 0);
  const discount = Math.min(parseFloat(discountStr) || 0, subtotal);
  const discountedSubtotal = subtotal - discount;
  const tax = discountedSubtotal * (storeSettings.taxRate / 100);
  const total = discountedSubtotal + tax;


  // Sync customer debt calculation only
  useEffect(() => {
    if (!customerPhone && !customerId) {
      setCustomerDebt(0);
      return;
    }
    const existingCust = customers.find(c => 
      (customerPhone && c.phone === customerPhone) || 
      (customerId && c.custom_id === customerId)
    );

    if (existingCust) {
      const cOrders = orders.filter(o => o.customer?.id === existingCust.id);
      const cDebt = cOrders.reduce((sum, o) => {
        const itemsSum = o.items.reduce((s, i) => s + (i.quantity * i.sale_price), 0);
        const discountRatio = itemsSum > 0 ? o.total / itemsSum : 1;
        const returnedValue = o.items.reduce((s, i) => s + (i.returned_quantity * i.sale_price), 0) * discountRatio;
        return sum + Math.max(0, (o.total - returnedValue) - o.paid_amount);
      }, 0);
      setCustomerDebt(cDebt > 0 ? cDebt : 0);
    } else {
      setCustomerDebt(0);
    }
  }, [customerPhone, customerId, orders, customers]);

  const handleReturnAll = async () => {
    if (!activeReturnOrder) return;
    if (!confirm("هل أنت متأكد من رغبتك في استرجاع الفاتورة بالكامل؟")) return;

    for (const item of activeReturnOrder.items) {
      const available = item.quantity - item.returned_quantity;
      if (available > 0) {
        await processReturn(activeReturnOrder.id, item.id, available);
      }
    }
    
    alert('تم استرجاع الفاتورة بالكامل بنجاح');
    const updatedOrder = useStore.getState().orders.find(o => o.id === activeReturnOrder.id);
    setActiveReturnOrder(updatedOrder);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerPhone(val);
    if (val) {
      const match = customers.find(c => c.phone === val);
      if (match) {
        setCustomerName(match.name);
        setCustomerId(match.custom_id || '');
      }
    }
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerId(val);
    if (val) {
      const match = customers.find(c => c.custom_id === val);
      if (match) {
        setCustomerName(match.name);
        setCustomerPhone(match.phone);
      }
    }
  };


  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 overflow-hidden font-sans text-gray-900 dark:text-gray-100">

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Banknote size={40} />
              </div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">تم الدفع بنجاح!</h2>
              <p className="text-slate-500 dark:text-slate-400 font-bold mb-6 font-mono text-lg">رقم الفاتورة: #{lastInvoiceId}</p>
              
              <div className="space-y-3">
                {lastCustomerInfo?.phone && (
                  <button 
                    onClick={() => {
                       const sendWhatsApp = (invId: string, customerPhone: string, orderDetails: any) => {
                          if (!customerPhone.trim()) return;
                          let itemsText = orderDetails.cart.map((item: any) => `• ${item.name} (عدد: ${item.quantity}) - ${(item.sale_price * item.quantity).toFixed(2)} ${storeSettings.currency}`).join('\n');
                           const invoiceLink = `${window.location.origin}/view-invoice/${invId}`;
                           const message = `*فاتورة جديدة من ${storeSettings.name}* 🧾\n\n` +
                             `*رقم الفاتورة:* #${invId}\n` +
                             `*التاريخ:* ${new Date().toLocaleString('ar-SA')}\n` +
                             `*الإجمالي:* ${orderDetails.total.toFixed(2)} ${storeSettings.currency}\n\n` +
                             `*عرض الفاتورة بالتفاصيل:* 👇\n${invoiceLink}\n\n` +
                             `*تفاصيل الطلب:*\n${itemsText}\n\n` +
                             `${storeSettings.address ? `📍 *العنوان:* ${storeSettings.address}\n` : ''}` +
                             `${storeSettings.phone ? `📞 *للتواصل:* ${storeSettings.phone}\n` : ''}` +
                             `\n*شكراً لتعاملكم معنا، في انتظاركم مرة أخرى!* ❤️\n` +
                             `*ما رأيك في خدمتنا؟ نسعد بتلقي ملاحظاتك.*`;
                          let cleanPhone = customerPhone.replace(/\D/g, '');
                          const code = storeSettings.whatsappCountryCode || '2';
                          
                          // Generic cleaning: if it starts with 0, remove and add code. 
                          // If it doesn't have the code yet, add it.
                          if (cleanPhone.startsWith('0')) {
                            cleanPhone = code + cleanPhone.substring(1);
                          } else if (!cleanPhone.startsWith(code)) {
                            cleanPhone = code + cleanPhone;
                          }

                          const encodedMsg = encodeURIComponent(message);
                          window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
                        };
                        sendWhatsApp(lastInvoiceId, lastCustomerInfo.phone, lastOrderDetails);
                    }}
                    className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-lg scale-105"
                  >
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    إرسال للفاتورة لواتساب
                  </button>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => printInvoice(lastInvoiceId, lastOrderDetails)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border border-slate-200"
                  >
                    <Printer size={20} /> إعادة طباعة
                  </button>
                  <button 
                    onClick={() => {
                      setShowSuccessModal(false);
                      clearCart();
                    }}
                    className="flex-1 bg-slate-900 hover:bg-black text-white py-3.5 rounded-2xl font-bold transition-all"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showReturnsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-slate-700">
            <div className="p-6 bg-gradient-to-r from-red-500 to-orange-500 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ArrowRightLeft size={24} /> نظام المرتجعات
              </h2>
              <button onClick={() => setShowReturnsModal(false)} className="hover:bg-white/20 p-2 rounded-full transition">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="أدخل رقم الفاتورة للبحث..." 
                  className="flex-1 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-left"
                  dir="ltr"
                  value={returnSearchQuery}
                  onChange={(e) => setReturnSearchQuery(e.target.value)}
                />
                <button onClick={handleSearchOrder} className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shrink-0">بحث برقم الفاتورة</button>
              </div>

              {activeReturnOrder && (() => {
                const itemsSum = activeReturnOrder.items.reduce((sum: number, item: any) => sum + (item.quantity * item.sale_price), 0);
                const discountRatio = itemsSum > 0 ? activeReturnOrder.total / itemsSum : 1;
                
                const initialDebt = Math.max(0, activeReturnOrder.total - activeReturnOrder.paid_amount);
                const totalReturnedValue = activeReturnOrder.items.reduce((sum: number, item: any) => sum + (item.returned_quantity * item.sale_price), 0) * discountRatio;
                const cashRefund = Math.max(0, totalReturnedValue - initialDebt);
                const debtReduction = Math.min(totalReturnedValue, initialDebt);
                
                return (
                  <>
                    {/* Financial Summary Card */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">إجمالي الفاتورة</span>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">{activeReturnOrder.total.toFixed(2)} {storeSettings.currency}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">المبلغ المدفوع</span>
                        <span className="text-sm font-black text-green-600 dark:text-green-400">{activeReturnOrder.paid_amount.toFixed(2)} {storeSettings.currency}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">مديونية الفاتورة</span>
                        <span className="text-sm font-black text-red-600 dark:text-red-400">{initialDebt.toFixed(2)} {storeSettings.currency}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">إجمالي المرتجع</span>
                        <span className="text-sm font-black text-orange-600 dark:text-orange-400">{totalReturnedValue.toFixed(2)} {storeSettings.currency}</span>
                      </div>
                    </div>

                    {/* Action/Result Status */}
                    <div className="flex flex-col gap-2 mb-4">
                      {debtReduction > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50 flex justify-between items-center text-sm">
                          <span className="font-bold flex items-center gap-2 italic">✓ خصم من مديونية الفاتورة:</span>
                          <span className="font-black text-base">{debtReduction.toFixed(2)} {storeSettings.currency}</span>
                        </div>
                      )}
                      {cashRefund > 0 ? (
                        <div className="bg-emerald-500 text-white p-4 rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none flex justify-between items-center animate-pulse">
                          <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg"><Banknote size={24} /></div>
                            <span className="font-black text-lg">المبلغ المستحق رده (كاش):</span>
                          </div>
                          <span className="text-2xl font-black">{cashRefund.toFixed(2)} {storeSettings.currency}</span>
                        </div>
                      ) : initialDebt > 0 && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 p-3 rounded-xl border border-orange-100 dark:border-orange-800/50 flex justify-between items-center text-sm italic">
                          <span>المتبقي من مديونية الفاتورة:</span>
                          <span className="font-black">{(initialDebt - totalReturnedValue).toFixed(2)} {storeSettings.currency}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 border border-gray-200 dark:border-slate-700 flex flex-col rounded-xl overflow-hidden">
                      <div className="bg-gray-100 dark:bg-slate-700 p-4 flex justify-between items-center border-b border-gray-200 dark:border-slate-600">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-700 dark:text-gray-200 font-mono tracking-wider">الأصناف المتاحة للإرجاع</span>
                          <span className="text-[10px] text-slate-500 font-bold">رقم الفاتورة: #{activeReturnOrder.id}</span>
                        </div>
                        <button 
                          onClick={handleReturnAll}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg transition-all"
                        >
                          إرجاع الفاتورة بالكامل
                        </button>
                      </div>
                      <div className="p-4 space-y-3 max-h-72 overflow-y-auto hide-scrollbar">
                        {activeReturnOrder.items.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-600 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col">
                              <span className="font-bold text-md text-gray-800 dark:text-gray-100">{item.name}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">الكمية المسجلة: {item.quantity} | المسترجع: <span className="text-red-500 font-bold">{item.returned_quantity}</span></span>
                            </div>
                            <button 
                              disabled={item.quantity === item.returned_quantity}
                              onClick={() => handleReturnItem(item.id)} 
                              className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition border border-red-100 dark:border-red-900/50"
                            >إرجاع</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 shadow-2xl z-10 w-2/3">
        <header className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => { if(confirm('هل تريد تسجيل الخروج؟')) { logoutPOS(); navigate('/pos-login'); } }}>
              <img src={activeCashier?.photo_url || storeSettings.logo} alt="Logo" className="w-12 h-12 object-cover rounded-xl shadow-md border border-gray-100 dark:border-slate-700 bg-white p-0.5 group-hover:scale-110 transition-transform" />
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900"></div>
            </div>
            <div className="flex flex-col">
               <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-l from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                أهلاً، {activeCashier?.name?.split(' ')[0] || 'المحاسب'}
              </h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{storeSettings.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-1 max-w-lg ml-6">
            <div className="relative w-full">
              <Search className="absolute right-4 top-3.5 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="ابحث باسم المنتج..."
                style={{ '--tw-ring-color': storeSettings.themeColor + '40' } as any}
                className="w-full bg-slate-100 dark:bg-slate-800 dark:text-white border-none rounded-2xl py-3.5 pr-12 pl-4 text-sm focus:outline-none focus:ring-2 shadow-inner transition"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button onClick={() => setShowReturnsModal(true)} className="flex items-center gap-2 px-5 py-3.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 rounded-2xl font-bold transition border border-red-100 dark:border-red-900/30 whitespace-nowrap shadow-sm">
              <RefreshCcw size={18} /> مرتجع
            </button>
            <button onClick={toggleTheme} className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 transition shadow-sm">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {/* Categories Tabs */}
        <div className="flex gap-3 p-5 overflow-x-auto border-b border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hide-scrollbar items-center">
          <button
            onClick={() => setActiveCategory('all')}
            style={activeCategory === 'all' ? { background: storeSettings.themeColor } : {}}
            className={`px-6 py-2.5 rounded-2xl whitespace-nowrap font-bold transition shadow-sm border ${
              activeCategory === 'all' 
              ? 'text-white border-transparent' 
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            الكل
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              style={activeCategory === c.id ? { background: storeSettings.themeColor } : {}}
              className={`px-6 py-2.5 rounded-2xl whitespace-nowrap font-bold transition shadow-sm border ${
                activeCategory === c.id 
                ? 'text-white border-transparent' 
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Product Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900 border-l border-gray-100 dark:border-slate-800 relative">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.stock_quantity <= 0;
              const isLowStock = product.stock_quantity > 0 && product.stock_quantity < 5;
              const avgPrice = product.average_purchase_price || product.purchase_price || 0;
              const lastPrice = product.purchase_price || 0;
              
              return (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm hover:shadow-xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between border border-gray-100 dark:border-slate-700 ring-1 ring-black/5 dark:ring-white/5 relative overflow-hidden group ${isOutOfStock ? 'opacity-60 cursor-not-allowed grayscale' : ''}`}
                >
                  <div className={`absolute top-0 right-0 rounded-bl-3xl rounded-tr-xl px-3 py-1 text-xs font-bold text-white shadow-sm transition-colors ${isOutOfStock ? 'bg-slate-500' : isLowStock ? 'bg-red-500' : 'bg-green-500 dark:bg-green-600'}`}>
                    {isOutOfStock ? 'نفذت' : `${product.stock_quantity} قطعة`}
                  </div>

                  <div className="pt-2">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 line-clamp-2 leading-tight text-base">{product.name}</h3>
                    {/* Purchase cost info for cashier */}
                    <div className="mt-2 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-slate-400 font-medium">آخر شراء:</span>
                        <span className="font-bold text-orange-500">{lastPrice.toFixed(2)} {storeSettings.currency}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-slate-400 font-medium">متوسط:</span>
                        <span className="font-bold text-indigo-500">{avgPrice.toFixed(2)} {storeSettings.currency}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-end justify-between mt-3 pt-2 border-t border-gray-100 dark:border-slate-700">
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium mb-0.5">سعر البيع</p>
                      <span style={{ color: storeSettings.themeColor }} className="text-lg font-black dark:opacity-90">{product.sale_price} <span className="text-xs text-gray-500 dark:text-gray-400">{storeSettings.currency}</span></span>
                    </div>
                    <div style={!isOutOfStock ? { backgroundColor: storeSettings.themeColor + '15', color: storeSettings.themeColor, borderColor: storeSettings.themeColor + '30' } : {}} className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${isOutOfStock ? 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-slate-700 dark:border-slate-600' : ''}`}>
                      <Plus size={18} strokeWidth={3}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-1/3 min-w-[420px] bg-white dark:bg-slate-800 flex flex-col z-20 shadow-2xl relative">
        <div
          style={{ 
            background: `linear-gradient(160deg, ${storeSettings.themeColor} 0%, ${storeSettings.themeColor}dd 100%)`,
            boxShadow: `0 8px 32px ${storeSettings.themeColor}66`
          }}
          className="p-4 text-white flex flex-col relative h-auto rounded-bl-[40px] gap-3 z-[60]"
        >

          <div className="absolute inset-0 bg-black/20 rounded-bl-[40px]"></div>

          <div className="relative flex justify-between items-center mb-4">
             <h2 className="text-xl font-black flex items-center gap-2 drop-shadow">
              <ShoppingCart size={24} />
              الفاتورة
            </h2>
            <div className="flex items-center gap-2">
              <div className="font-mono flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg border border-white/20 text-xs">
                <span className="opacity-80 font-sans">رقم:</span> <span className="font-bold tracking-widest">{activeInvoiceId}</span>
              </div>
              <div className="bg-black/20 px-3 py-1 rounded-lg text-xs font-bold border border-white/20">
                 {cart.length} الأصناف
              </div>
            </div>
          </div>

          {/* Customer Inputs Grid */}
          <div className="relative flex gap-1.5 text-sm h-11">
            <div className="flex-1 relative group">
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:scale-110 transition-transform"><CreditCard size={14}/></span>
              <input 
                type="text" dir="ltr" value={customerId} onChange={handleIdChange} 
                className="w-full bg-white/95 text-indigo-600 dark:text-indigo-400 placeholder-slate-400 border-0 py-2 pr-8 pl-2 rounded-xl focus:ring-2 focus:ring-white focus:outline-none transition font-black shadow-inner text-xs h-full" 
                placeholder="رقم الكارت" 
              />
            </div>
            <div className="flex-1 relative group">
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:scale-110 transition-transform"><Smartphone size={14}/></span>
              <input 
                type="text" dir="ltr" value={customerPhone} onChange={handlePhoneChange} 
                className="w-full bg-white/95 text-slate-800 placeholder-slate-400 border-0 py-2 pr-8 pl-2 rounded-xl focus:ring-2 focus:ring-white focus:outline-none transition font-medium shadow-inner text-xs h-full" 
                placeholder="الموبايل" 
              />
            </div>
            <div className="flex-[1.2] relative group">
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:scale-110 transition-transform"><ShoppingCart size={14}/></span>
              <input 
                type="text" value={customerName} 
                onChange={e => { setCustomerName(e.target.value); setShowCustomerSuggestions(true); }} 
                onFocus={() => setShowCustomerSuggestions(true)}
                className="w-full bg-white/95 text-slate-800 placeholder-slate-400 border-0 py-2 pr-8 pl-2 rounded-xl focus:ring-2 focus:ring-white focus:outline-none transition font-medium shadow-inner text-xs h-full" 
                placeholder="الاسم" 
              />
              {showCustomerSuggestions && filteredCustomers.length > 0 && (
                <div className="absolute z-[200] left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 max-h-64 overflow-y-auto">
                  {filteredCustomers.map(c => (
                    <button
                      key={c.id} onClick={() => handleSelectCustomer(c)}
                      className="w-full text-right px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between border-b border-gray-50 dark:border-slate-700 last:border-0"
                    >
                      <div className="flex flex-col text-right">
                        <span className="font-bold text-slate-800 dark:text-slate-100">{c.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono" dir="ltr">{c.phone}</span>
                      </div>
                      <div className="bg-indigo-600 px-3 py-1.5 rounded-lg text-white font-mono text-[10px] font-black">{c.custom_id || c.id.substring(0, 6)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {customerDebt > 0 && (
            <div className="relative mt-3 bg-black/20 border border-white/20 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between">
              <span>⚠️ مديونية سابقة:</span>
              <span className="bg-red-500 text-white px-2 py-0.5 rounded-lg font-mono border border-red-400">{customerDebt.toFixed(2)} {storeSettings.currency}</span>
            </div>
          )}
        </div>

        {/* Cart Listing */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50 dark:bg-slate-900/50" style={{ scrollbarWidth: 'thin' }}>
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 transition-opacity opacity-70">
              <ShoppingCart size={90} className="mb-6 opacity-30 drop-shadow-md" />
              <p className="text-2xl font-semibold">السلة فارغة</p>
              <p className="text-sm mt-2 opacity-70">أضف بعض المنتجات للبدء بحساب الفاتورة.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-gray-800 dark:text-gray-100 leading-tight w-4/5 text-base">{item.name}</h4>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 dark:text-red-500 transition-colors bg-red-50 dark:bg-red-900/20 p-2.5 rounded-xl opacity-0 group-hover:opacity-100 absolute left-4 top-4 border border-transparent hover:border-red-100 dark:hover:border-red-900/50">
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-50 dark:border-slate-700/50">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">سعر الوحدة:</label>
                      <input 
                        type="number"
                        dir="ltr"
                        value={item.sale_price}
                        onChange={(e) => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                        className="w-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-none rounded-lg px-2 py-1 text-sm font-black focus:ring-1 focus:ring-indigo-400 transition text-center"
                      />
                    </div>
                    <span className="font-black text-xl text-indigo-600 dark:text-indigo-400">
                      {(item.sale_price * item.quantity).toFixed(2)} <span className="text-xs text-gray-500">{storeSettings.currency}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl p-1 shadow-inner">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-lg text-gray-600 dark:text-gray-300 transition-colors shadow-sm">
                      <Minus size={16} strokeWidth={3}/>
                    </button>
                    <span className="w-10 text-center text-base font-bold dark:text-white">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-lg text-gray-600 dark:text-gray-300 transition-colors shadow-sm">
                      <Plus size={16} strokeWidth={3}/>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Checkout */}
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 shadow-2xl">
          <div className="space-y-3 mb-4 px-1">
            <div className="flex justify-between items-center text-sm font-bold text-slate-500 dark:text-slate-400">
               <span>المجموع: <span className="text-slate-800 dark:text-slate-200 text-lg">{subtotal.toFixed(2)}</span></span>
               <div className="flex items-center gap-2 bg-orange-100/50 dark:bg-orange-900/30 px-4 py-2 rounded-2xl border-2 border-orange-200 dark:border-orange-800/50 shadow-sm transition-all focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
                 <span className="text-xs text-orange-600 dark:text-orange-400 font-black flex items-center gap-1">🏷️ خصم:</span>
                 <input 
                   type="number" dir="ltr" value={discountStr} 
                   onChange={(e) => setDiscountStr(e.target.value)} 
                   placeholder="0.00" 
                   className="w-20 bg-transparent border-0 p-0 text-base font-black focus:ring-0 text-left text-orange-700 dark:text-orange-300 placeholder-orange-300" 
                 />
               </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">الإجمالي النهائي</span>
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">
                {total.toFixed(2)} <span className="text-xs text-slate-400 font-bold tracking-normal">{storeSettings.currency}</span>
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setShouldPrint(false); setShowCheckoutModal(true); }}
              disabled={cart.length === 0}
              style={cart.length > 0 ? { background: storeSettings.themeColor } : {}}
              className="flex-1 disabled:bg-gray-300 text-white py-4 rounded-2xl font-black flex flex-col items-center justify-center gap-1 transition-all text-sm active:scale-95 shadow-lg disabled:shadow-none group"
            >
              <Banknote size={20} className="group-hover:scale-110 transition-transform" />
              <span>تحصيل ودفع</span>
            </button>
            <button
              onClick={() => { setShouldPrint(true); setShowCheckoutModal(true); }}
              disabled={cart.length === 0}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-2xl font-black flex flex-col items-center justify-center gap-1 transition-all text-sm active:scale-95 shadow-lg shadow-emerald-500/20 disabled:shadow-none group"
            >
              <Printer size={20} className="group-hover:rotate-12 transition-transform" />
              <span>دفع وطباعة</span>
            </button>
          </div>
          <button onClick={clearCart} className="w-full text-slate-400 hover:text-red-500 text-xs font-bold py-3 transition-colors">
            إلغاء الطلب والتفريغ
          </button>
        </div>
      </div>
      {/* Checkout Payment Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-200">
                  <Banknote size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">توزيع مبالغ الدفع</h3>
                  <p className="text-xs text-slate-400 font-bold">يرجى تحديد كيفية تحصيل مبلغ الفاتورة</p>
                </div>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Total Amount Card */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-[24px] border border-indigo-100 dark:border-indigo-800/50 flex justify-between items-center">
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">إجمالي المطلوب سداده</span>
                <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">
                  {total.toFixed(2)} <span className="text-sm font-bold opacity-60">{storeSettings.currency}</span>
                </span>
              </div>

              {/* Payment Inputs Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'cash', label: 'كاش', val: paidCash, set: setPaidCash, icon: <Banknote size={18}/>, color: 'indigo' },
                  { id: 'visa', label: 'فيزا', val: paidVisa, set: setPaidVisa, icon: <CreditCard size={18}/>, color: 'blue' },
                  { id: 'wallet', label: 'محفظة', val: paidWallet, set: setPaidWallet, icon: <Smartphone size={18}/>, color: 'emerald' },
                  { id: 'insta', label: 'انستا', val: paidInstapay, set: setPaidInstapay, icon: <Zap size={18}/>, color: 'orange' }
                ].map((p) => (
                  <div key={p.id} className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-1.5">
                      {p.icon} {p.label}
                    </label>
                    <input 
                      type="number" dir="ltr" value={p.val} onChange={(e) => p.set(e.target.value)} placeholder="0.00"
                      className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 py-3 px-4 rounded-2xl focus:outline-none transition-all font-black text-lg text-left shadow-inner" 
                    />
                  </div>
                ))}
              </div>

              {/* Summary Bar */}
              <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-2xl flex justify-between items-center">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">المدفوع حالياً</span>
                  <span className="text-lg font-black text-slate-700 dark:text-slate-200">
                    {((parseFloat(paidCash || '0') + parseFloat(paidVisa || '0') + parseFloat(paidWallet || '0') + parseFloat(paidInstapay || '0'))).toFixed(2)}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">
                    {total - (parseFloat(paidCash || '0') + parseFloat(paidVisa || '0') + parseFloat(paidWallet || '0') + parseFloat(paidInstapay || '0')) > 0 ? 'متبقي (آجل)' : 'الباقي'}
                  </span>
                  <div className={`text-xl font-black ${total - (parseFloat(paidCash || '0') + parseFloat(paidVisa || '0') + parseFloat(paidWallet || '0') + parseFloat(paidInstapay || '0')) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {Math.abs(total - (parseFloat(paidCash || '0') + parseFloat(paidVisa || '0') + parseFloat(paidWallet || '0') + parseFloat(paidInstapay || '0'))).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
              <button 
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 py-4 px-6 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all active:scale-95"
              >
                تراجع
              </button>
              <button 
                onClick={() => {
                  handleCheckoutClick(shouldPrint);
                  setShowCheckoutModal(false);
                }}
                className="flex-[2] py-4 px-6 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {shouldPrint ? <Printer size={20}/> : <Banknote size={20}/>}
                تأكيد العملية وإنهاء الفاتورة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
