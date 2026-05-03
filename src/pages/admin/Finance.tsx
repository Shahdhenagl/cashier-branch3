import { useState } from 'react';
import { useStore, type Expense } from '../../store/useStore';
import { Wallet, Plus, Trash2, Search, FileText, ArrowUp, ArrowDown, Calendar, Edit3, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Finance() {
  const { expenses, orders, storeSettings, addExpense, updateExpense, deleteExpense, purchaseInvoices } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({ category: 'عام', amount: '', note: '' });

  // Filter expenses
  const filteredExpenses = expenses.filter(e => 
    e.category.includes(searchQuery) || e.note.includes(searchQuery)
  );

  // Financial Calculations
  const totalSales = orders.filter(o => o.type === 'sale').reduce((sum, o) => sum + o.paid_amount, 0);
  const totalPayments = orders.filter(o => o.type === 'payment').reduce((sum, o) => sum + o.paid_amount, 0);
  
  const totalReturnsValue = orders.reduce((sum, o) => {
    return sum + o.items.reduce((iSum, item) => iSum + (item.returned_quantity * item.sale_price), 0);
  }, 0);

  const totalExpensesValue = expenses.reduce((sum, e) => sum + e.amount, 0);

  const totalPurchasesPaid = purchaseInvoices.reduce((sum, inv) => sum + inv.paid_amount, 0);

  const netSafeBalance = (totalSales + totalPayments) - totalReturnsValue - totalExpensesValue - totalPurchasesPaid;

  const handleOpenModal = (expense: Expense | null = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({ category: expense.category, amount: expense.amount.toString(), note: expense.note });
    } else {
      setEditingExpense(null);
      setFormData({ category: 'عام', amount: '', note: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const amountNum = parseFloat(formData.amount);
    if (!amountNum || amountNum <= 0) return;

    if (editingExpense) {
      await updateExpense(editingExpense.id, {
        category: formData.category,
        amount: amountNum,
        note: formData.note
      });
    } else {
      await addExpense({
        category: formData.category,
        amount: amountNum,
        note: formData.note
      });
    }
    setShowModal(false);
  };

  const exportToExcel = () => {
    const wsData = [
      ['تقرير الخزينة والمصاريف', '', '', ''],
      ['التاريخ', new Date().toLocaleString('ar-SA'), '', ''],
      [''],
      ['إجمالي المبيعات (كاش)', totalSales],
      ['تحصيل مديونيات', totalPayments],
      ['إجمالي المرتجعات (خارج)', totalReturnsValue],
      ['إجمالي المصاريف (خارج)', totalExpensesValue],
      ['صافي الخزينة الحالي', netSafeBalance],
      [''],
      ['سجل المصاريف التفصيلي'],
      ['الفئة', 'المبلغ', 'الملاحظات', 'التاريخ'],
      ...expenses.map(e => [e.category, e.amount, e.note, new Date(e.date).toLocaleString('ar-SA')])
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Finance');
    XLSX.writeFile(wb, `finance_report_${new Date().toLocaleDateString()}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    doc.setFont("helvetica", "bold");
    doc.text("Finance Report - Financial Status", 105, 20, { align: 'center' });
    
    const summaryData = [
      ["Total Sales", `${totalSales} ${storeSettings.currency}`],
      ["Payments Collected", `${totalPayments} ${storeSettings.currency}`],
      ["Total Returns", `${totalReturnsValue} ${storeSettings.currency}`],
      ["Total Expenses", `${totalExpensesValue} ${storeSettings.currency}`],
      ["Total Purchases Paid", `${totalPurchasesPaid} ${storeSettings.currency}`],
      ["Net Safe Balance", `${netSafeBalance} ${storeSettings.currency}`],
    ];

    autoTable(doc, {
      startY: 30,
      head: [["Category", "Value"]],
      body: summaryData,
      theme: 'striped',
    });

    const expensesData = expenses.map(e => [
      e.category,
      e.amount.toString(),
      e.note,
      new Date(e.date).toLocaleDateString('ar-SA')
    ]);

    const finalY = (doc as any).lastAutoTable?.finalY || 100;

    autoTable(doc, {
      startY: finalY + 10,
      head: [["Category", "Amount", "Note", "Date"]],
      body: expensesData,
      theme: 'grid',
    });

    doc.save(`finance_report_${new Date().toLocaleDateString()}.pdf`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
              <Wallet size={28} />
            </div>
            الخزينة والحسابات
          </h1>
          <p className="text-slate-500 mt-2 font-medium">مراقبة الدخل، المصاريف، وصافي أرباح الخزينة</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
             <button 
              onClick={exportToPDF}
              className="flex items-center gap-2 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition"
            >
              <FileText size={16} className="text-red-500" /> PDF
            </button>
            <div className="w-px bg-slate-200 my-1 mx-1"></div>
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition"
            >
              <Download size={16} className="text-emerald-500" /> Excel
            </button>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            style={{ backgroundColor: storeSettings.themeColor }}
            className="flex items-center gap-2 text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition shadow-lg shadow-indigo-100"
          >
            <Plus size={20} /> إضافة عملية
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Incomes Card */}
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <ArrowUp size={28} />
            </div>
            <div>
              <p className="text-slate-400 font-bold text-xs">إجمالي الداخل</p>
              <p className="text-xs font-black text-emerald-600 uppercase tracking-tighter">(مبيعات + تحصيل)</p>
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-800">
            {(totalSales + totalPayments).toLocaleString()} 
            <span className="text-sm font-normal text-slate-400 mr-2">{storeSettings.currency}</span>
          </h3>
        </div>

        {/* Expenses Card */}
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
              <ArrowDown size={28} />
            </div>
            <div>
              <p className="text-slate-400 font-bold text-xs">إجمالي الخارج</p>
              <p className="text-xs font-black text-red-600 uppercase tracking-tighter">(مرتجعات + مصاريف + مشتريات)</p>
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-800">
            {(totalReturnsValue + totalExpensesValue + totalPurchasesPaid).toLocaleString()} 
            <span className="text-sm font-normal text-slate-400 mr-2">{storeSettings.currency}</span>
          </h3>
        </div>

        {/* Balance Card - RESTYLED */}
        <div className="relative group overflow-hidden rounded-[32px] p-6 shadow-2xl transition-all duration-500 hover:scale-[1.02]">
           {/* Dynamic Gradient Background */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-0"
          />
          <div 
            className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 -mr-16 -mt-16 rounded-full"
            style={{ backgroundColor: storeSettings.themeColor }}
          />
          <div 
            className="absolute bottom-0 left-0 w-32 h-32 blur-3xl opacity-10 -ml-16 -mb-16 rounded-full bg-emerald-500"
          />
          
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg backdrop-blur-md bg-white/10 border border-white/20"
              >
                <Wallet size={24} />
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                حالة الخزينة: آمنة
              </div>
            </div>
            
            <div className="mt-8">
              <p className="text-slate-400 font-bold text-xs mb-1 uppercase tracking-wider">صافي رصيد الخزينة الفعلي</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-black text-white tracking-tight">
                  {netSafeBalance.toLocaleString()}
                </h3>
                <span className="text-lg font-bold text-slate-500">{storeSettings.currency}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/30">
          <div className="relative w-full max-w-md">
            <Search className="absolute right-4 top-3 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="ابحث في سجل المصاريف..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pr-12 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold text-slate-600 shadow-sm">
            <Calendar size={16} /> {new Date().toLocaleDateString('ar-SA')}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="p-6">البند / الفئة</th>
                <th className="p-6">المبلغ</th>
                <th className="p-6 text-center">ملاحظات إضافية</th>
                <th className="p-6 text-center">التاريخ</th>
                <th className="p-6 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <FileText size={64} />
                      <p className="text-xl font-bold mt-4">لا توجد عمليات مسجلة</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-6">
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-xs border border-indigo-100">
                        {expense.category}
                      </span>
                    </td>
                    <td className="p-6 font-black text-red-600 text-lg">
                      {expense.amount.toLocaleString()} <span className="text-xs font-normal text-slate-400">{storeSettings.currency}</span>
                    </td>
                    <td className="p-6 text-slate-500 font-medium text-center">
                      {expense.note || '—'}
                    </td>
                    <td className="p-6 text-slate-400 text-sm font-bold text-center">
                      {new Date(expense.date).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="p-6 text-left">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenModal(expense)}
                          className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => deleteExpense(expense.id)}
                          className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div 
              className="p-8 text-white flex justify-between items-center"
              style={{ backgroundColor: storeSettings.themeColor }}
            >
              <div>
                <h2 className="text-2xl font-black">{editingExpense ? 'تعديل العملية' : 'إضافة عملية جديدة'}</h2>
                <p className="text-white/70 text-sm mt-1">سجل تفاصيل المصاريف أو التكاليف</p>
              </div>
              <button onClick={() => setShowModal(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">الفئة / البند</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="عام">عام</option>
                  <option value="إيجار">إيجار</option>
                  <option value="كهرباء/مياه">كهرباء / مياه</option>
                  <option value="رواتب">رواتب موظفين</option>
                  <option value="نقل/توصيل">نقل / توصيل</option>
                  <option value="صيانة">صيانة</option>
                  <option value="مشتريات للمحل">مشتريات للمحل</option>
                  <option value="إهلاك">إهلاك</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">المبلغ</label>
                <div className="relative">
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pr-12 focus:ring-2 focus:ring-indigo-500/20 outline-none font-black text-2xl text-red-600"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{storeSettings.currency}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">ملاحظات</label>
                <textarea 
                  placeholder="اكتب ملاحظاتك هنا..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 h-32 focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium resize-none"
                  value={formData.note}
                  onChange={e => setFormData({...formData, note: e.target.value})}
                />
              </div>
              <button 
                onClick={handleSubmit}
                style={{ backgroundColor: storeSettings.themeColor }}
                className="w-full text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-3"
              >
                {editingExpense ? 'حفظ التعديلات' : 'إضافة العملية'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
