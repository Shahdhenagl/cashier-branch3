import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// ─── Types ───────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  barcode: string;
  purchase_price: number;
  average_purchase_price: number;
  sale_price: number;
  stock_quantity: number;
  category_id: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface OrderItem extends Product {
  quantity: number;
  returned_quantity: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  timestamp: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  created_at: string;
}

export interface PurchaseItem {
  id?: string;
  product_id: string;
  quantity: number;
  purchase_price: number;
}

export interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  supplier_id: string;
  total: number;
  paid_amount: number;
  payment_method: 'cash' | 'visa' | 'wallet' | 'instapay';
  created_at: string;
  items?: PurchaseItem[];
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  paid_amount: number;
  type: 'sale' | 'payment';
  date: string;
  payment_method: 'cash' | 'visa' | 'wallet' | 'instapay';
  customer?: Customer;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  note: string;
  payment_method: 'cash' | 'visa' | 'wallet' | 'instapay';
  date: string;
}

export interface StoreSettings {
  name: string;
  currency: string;
  logo: string;
  taxRate: number;
  themeColor: string;
  address: string;
  phone: string;
  phone2: string;
  whatsappCountryCode: string;
  initial_balance: number;
}

// ─── Store Interface ──────────────────────────────────────────
interface CashierStore {
  storeSettings: StoreSettings;
  products: Product[];
  categories: Category[];
  customers: Customer[];
  suppliers: Supplier[];
  cart: OrderItem[];
  orders: Order[];
  expenses: Expense[];
  purchaseInvoices: PurchaseInvoice[];
  invoiceCounter: number;
  activeInvoiceId: string;
  isLoading: boolean;
  dbError: string | null;

  // Data loading
  loadAll: () => Promise<void>;
  loadSettingsOnly: () => Promise<void>;

  // Cart
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  // Operations
  checkout: (total: number, customerDetails?: { name: string; phone: string }, paidAmount?: number, type?: 'sale' | 'payment', paymentMethod?: string) => Promise<string>;
  processReturn: (orderId: string, productId: string, returnQty: number) => Promise<boolean>;

  // Admin
  loadAnalyticsData: (startDate?: string, endDate?: string) => Promise<Order[]>;
  updateSettings: (settings: Partial<StoreSettings>) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  
  // Expenses
  addExpense: (expense: Omit<Expense, 'id' | 'date'>) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Suppliers
  addSupplier: (supplier: Omit<Supplier, 'id' | 'created_at'>) => Promise<void>;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  // Purchases
  loadPurchaseInvoices: () => Promise<void>;
  addPurchaseInvoice: (invoice: Omit<PurchaseInvoice, 'id' | 'created_at' | 'items'>, items: PurchaseItem[]) => Promise<void>;
  paySupplierDebt: (supplierId: string, amount: number) => Promise<void>;

  // Auth
  isAdminAuthenticated: boolean;
  login: (pin: string) => boolean;
  logout: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────
function mapSettings(row: Record<string, unknown>): StoreSettings {
  return {
    name: (row.name as string) ?? 'محلي',
    currency: (row.currency as string) ?? 'ج.م',
    logo: (row.logo as string) ?? '',
    taxRate: (row.tax_rate as number) ?? 0,
    themeColor: (row.theme_color as string) ?? '#4f46e5',
    address: (row.address as string) ?? '',
    phone: (row.phone as string) ?? '',
    phone2: (row.phone2 as string) ?? '',
    whatsappCountryCode: (row.whatsapp_country_code as string) ?? '2',
    initial_balance: (row.initial_balance as number) ?? 0,
  };
}

// ─── Store ───────────────────────────────────────────────────
export const useStore = create<CashierStore>((set, get) => ({
  storeSettings: {
    name: 'محل اللحوم الطازجة',
    currency: 'ج.م',
    logo: 'https://cdn-icons-png.flaticon.com/512/3143/3143641.png',
    taxRate: 0,
    themeColor: '#4f46e5',
    address: '',
    phone: '',
    phone2: '',
    whatsappCountryCode: '2',
    initial_balance: 0,
  },
  products: [],
  categories: [],
  customers: [],
  suppliers: [],
  cart: [],
  orders: [],
  expenses: [],
  purchaseInvoices: [],
  invoiceCounter: 1,
  activeInvoiceId: '1',
  isLoading: false,
  dbError: null,
  isAdminAuthenticated: !!sessionStorage.getItem('cashier_admin_auth'),

  login: (pin: string) => {
    if (pin === '1234') {
      sessionStorage.setItem('cashier_admin_auth', 'true');
      set({ isAdminAuthenticated: true });
      return true;
    }
    return false;
  },

  logout: () => {
    sessionStorage.removeItem('cashier_admin_auth');
    set({ isAdminAuthenticated: false });
  },

  // ── Load all data from Supabase ────────────────────────────
  loadAll: async () => {
    set({ isLoading: true, dbError: null });
    try {
      const [settingsRes, categoriesRes, productsRes, customersRes, ordersRes, counterRes] =
        await Promise.all([
          supabase.from('store_settings').select('*').limit(1).maybeSingle(),
          supabase.from('categories').select('*').order('name'),
          supabase.from('products').select('*').order('name'),
          supabase.from('customers').select('*').order('created_at', { ascending: false }),
          supabase
            .from('orders')
            .select('*, customers(*), order_items(*, products(*))')
            .order('created_at', { ascending: false })
            .limit(200),
          supabase.from('invoice_counter').select('current_value').limit(1).maybeSingle(),
        ]);

      const settings = settingsRes.data ? mapSettings(settingsRes.data as Record<string, unknown>) : get().storeSettings;

      const customers: Customer[] = ((customersRes.data ?? []) as Record<string, unknown>[]).map((c) => ({
        id: c.id as string,
        name: c.name as string,
        phone: c.phone as string,
        timestamp: c.created_at as string,
      }));

      const orders: Order[] = ((ordersRes.data ?? []) as Record<string, unknown>[]).map((o) => {
        const custRow = o.customers as Record<string, unknown> | null;
        const itemRows = (o.order_items as Record<string, unknown>[]) ?? [];
        const items: OrderItem[] = itemRows.map((i) => {
          const prod = (i.products as Record<string, unknown>) ?? {};
          return {
            id: (i.product_id as string) ?? (i.id as string),
            name: (i.product_name as string) ?? (prod.name as string) ?? '',
            barcode: (prod.barcode as string) ?? '',
            purchase_price: (i.purchase_price as number) ?? (prod.average_purchase_price as number) ?? (prod.purchase_price as number) ?? 0,
            average_purchase_price: (i.purchase_price as number) ?? (prod.average_purchase_price as number) ?? (prod.purchase_price as number) ?? 0,
            sale_price: i.sale_price as number,
            stock_quantity: (prod.stock_quantity as number) ?? 0,
            category_id: (prod.category_id as string) ?? '',
            quantity: i.quantity as number,
            returned_quantity: (i.returned_quantity as number) ?? 0,
          };
        });
        return {
          id: o.id as string,
          total: o.total as number,
          paid_amount: (o.paid_amount as number) ?? (o.total as number),
          type: (o.type as string) as 'sale' | 'payment' ?? 'sale',
          payment_method: (o.payment_method as any) ?? 'cash',
          date: o.created_at as string,
          items,
          customer: custRow
            ? { id: custRow.id as string, name: custRow.name as string, phone: custRow.phone as string, timestamp: custRow.created_at as string }
            : undefined,
        };
      });

      const counter = (counterRes.data as Record<string, unknown> | null)?.current_value as number ?? 1;

        set({
        storeSettings: settings,
        categories: (categoriesRes.data ?? []) as Category[],
        products: (productsRes.data ?? []).map((p: any) => ({
          ...p,
          average_purchase_price: p.average_purchase_price ?? p.purchase_price ?? 0
        })) as Product[],
        customers,
        orders,
        expenses: [], // Default to empty
        invoiceCounter: counter,
        activeInvoiceId: counter.toString(),
        isLoading: false,
      });

      // Fetch expenses separately to avoid breaking the whole loadAll if the table is missing
      try {
        const { data: expData } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
        if (expData) {
          set({
            expenses: (expData as any[]).map(e => ({
              id: e.id,
              category: e.category,
              amount: e.amount,
              note: e.note,
              payment_method: e.payment_method ?? 'cash',
              date: e.created_at
            }))
          });
        }
      } catch (e) {
        console.error("Expenses table might not exist yet:", e);
      }

      try {
        const { data: supData } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
        if (supData) {
          set({
            suppliers: (supData as any[]).map(s => ({
              ...s
            }))
          });
        }
      } catch (e) {
        console.error("Suppliers table might not exist yet:", e);
      }

      // Fetch purchase invoices
      get().loadPurchaseInvoices();

      // Sync settings across tabs
      const bc = new BroadcastChannel('cashier-sync');
      bc.onmessage = (msg) => {
        if (msg.data === 'sync_settings') {
          get().loadSettingsOnly();
        }
      };
    } catch (err) {
      set({ isLoading: false, dbError: String(err) });
    }
  },

  loadSettingsOnly: async () => {
    try {
      const { data } = await supabase.from('store_settings').select('*').limit(1).maybeSingle();
      if (data) {
        set({ storeSettings: mapSettings(data as Record<string, unknown>) });
      }
    } catch(e) { console.error(e); }
  },

  // ── Cart ───────────────────────────────────────────────────
  addToCart: (product) =>
    set((state) => {
      if (product.stock_quantity <= 0) return state;
      const existing = state.cart.find((i) => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) return state;
        return { cart: state.cart.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)) };
      }
      return { cart: [...state.cart, { ...product, quantity: 1, returned_quantity: 0 }] };
    }),

  removeFromCart: (productId) => set((state) => ({ cart: state.cart.filter((i) => i.id !== productId) })),

  updateQuantity: (productId, quantity) =>
    set((state) => {
      const product = state.products.find((p) => p.id === productId);
      if (!product) return state;
      const validQty = Math.max(1, Math.min(quantity, product.stock_quantity));
      return { cart: state.cart.map((i) => (i.id === productId ? { ...i, quantity: validQty } : i)) };
    }),

  clearCart: () => set({ cart: [] }),

  // ── Checkout ───────────────────────────────────────────────
  checkout: async (total, customerDetails, paidAmount = total, type = 'sale', paymentMethod = 'cash') => {
    const state = get();
    if (state.cart.length === 0 && type !== 'payment') return state.activeInvoiceId;

    const invoiceId = state.activeInvoiceId;
    let customerId: string | null = null;
    let finalCustomer: Customer | undefined;

    // Upsert customer
    if (customerDetails?.phone.trim()) {
      const phone = customerDetails.phone.trim();
      const existing = state.customers.find((c) => c.phone === phone);
      if (existing) {
        customerId = existing.id;
        finalCustomer = existing;
      } else {
        const { data: newCust } = await supabase
          .from('customers')
          .insert({ name: customerDetails.name || 'بدون اسم', phone })
          .select()
          .single();
        if (newCust) {
          customerId = (newCust as Record<string, unknown>).id as string;
          finalCustomer = {
            id: customerId,
            name: (newCust as Record<string, unknown>).name as string,
            phone,
            timestamp: (newCust as Record<string, unknown>).created_at as string,
          };
        }
      }
    }

    const savedPaidAmount = type === 'payment' ? paidAmount : Math.min(total, paidAmount);

    // Insert order
    const { error: orderError } = await supabase.from('orders').insert({ 
      id: invoiceId, 
      total, 
      paid_amount: savedPaidAmount,
      type,
      customer_id: customerId,
      payment_method: paymentMethod
    });

    if (orderError) {
      console.error("Order Insert Error:", orderError);
      alert(`خطأ في الحفظ: ${orderError.message}`);
      return invoiceId; // Exit maybe? or throw
    }

    // Insert order items
    const itemsPayload = state.cart.map((item) => ({
      order_id: invoiceId,
      product_id: item.id,
      product_name: item.name,
      barcode: item.barcode,
      quantity: item.quantity,
      returned_quantity: 0,
      sale_price: item.sale_price,
      purchase_price: item.average_purchase_price || item.purchase_price,
    }));
    const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
    if (itemsError) {
      console.error("Order Items Insert Error:", itemsError);
    }

    // Update stock
    for (const item of state.cart) {
      const newQty = (state.products.find((p) => p.id === item.id)?.stock_quantity ?? 0) - item.quantity;
      await supabase.from('products').update({ stock_quantity: Math.max(0, newQty) }).eq('id', item.id);
    }

    // Increment counter
    const nextCounter = state.invoiceCounter + 1;
    await supabase.from('invoice_counter').update({ current_value: nextCounter }).eq('id', 1);

    // Build new order for local state
    const newOrder: Order = {
      id: invoiceId,
      items: state.cart.map((i) => ({ ...i })),
      total,
      paid_amount: savedPaidAmount,
      type,
      payment_method: paymentMethod as any,
      date: new Date().toISOString(),
      customer: finalCustomer,
    };

    const updatedProducts = state.products.map((p) => {
      const cartItem = state.cart.find((c) => c.id === p.id);
      return cartItem ? { ...p, stock_quantity: Math.max(0, p.stock_quantity - cartItem.quantity) } : p;
    });

    const updatedCustomers = finalCustomer && !state.customers.find((c) => c.id === finalCustomer!.id)
      ? [finalCustomer, ...state.customers]
      : state.customers;

    set({
      orders: [newOrder, ...state.orders],
      cart: [],
      products: updatedProducts,
      customers: updatedCustomers,
      invoiceCounter: nextCounter,
      activeInvoiceId: nextCounter.toString(),
    });

    return invoiceId;
  },

  // ── Returns ────────────────────────────────────────────────
  processReturn: async (orderId, productId, returnQty) => {
    const state = get();
    const orderIndex = state.orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) return false;

    const order = state.orders[orderIndex];
    const itemIndex = order.items.findIndex((i) => i.id === productId);
    if (itemIndex === -1) return false;

    const item = order.items[itemIndex];
    const available = item.quantity - item.returned_quantity;
    if (returnQty <= 0 || returnQty > available) return false;

    const newReturnedQty = item.returned_quantity + returnQty;

    // Update DB
    const orderItemRow = await supabase
      .from('order_items')
      .select('id, returned_quantity')
      .eq('order_id', orderId)
      .eq('product_id', productId)
      .single();

    if (orderItemRow.data) {
      await supabase
        .from('order_items')
        .update({ returned_quantity: newReturnedQty })
        .eq('id', (orderItemRow.data as Record<string, unknown>).id as string);
    }

    const product = state.products.find((p) => p.id === productId);
    if (product) {
      await supabase
        .from('products')
        .update({ stock_quantity: product.stock_quantity + returnQty })
        .eq('id', productId);
    }

    // Update local state
    const updatedItems = order.items.map((i, idx) =>
      idx === itemIndex ? { ...i, returned_quantity: newReturnedQty } : i
    );
    const updatedOrders = state.orders.map((o, idx) =>
      idx === orderIndex ? { ...o, items: updatedItems } : o
    );
    const updatedProducts = state.products.map((p) =>
      p.id === productId ? { ...p, stock_quantity: p.stock_quantity + returnQty } : p
    );

    set({ orders: updatedOrders, products: updatedProducts });
    return true;
  },

  // ── Admin ──────────────────────────────────────────────────
  loadAnalyticsData: async (startDate, endDate) => {
    let query = supabase
      .from('orders')
      .select('*, customers(*), order_items(*, products(*))')
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error } = await query.limit(1000);
    if (error) {
      console.error("Analytics Load Error:", error);
      return [];
    }

    const orders: Order[] = (data as Record<string, unknown>[]).map((o) => {
      const custRow = o.customers as Record<string, unknown> | null;
      const itemRows = (o.order_items as Record<string, unknown>[]) ?? [];
      const items: OrderItem[] = itemRows.map((i) => {
        const prod = (i.products as Record<string, unknown>) ?? {};
        return {
          id: (i.product_id as string) ?? (i.id as string),
          name: (i.product_name as string) ?? (prod.name as string) ?? '',
          barcode: (prod.barcode as string) ?? '',
          purchase_price: (i.purchase_price as number) ?? (prod.average_purchase_price as number) ?? (prod.purchase_price as number) ?? 0,
          average_purchase_price: (i.purchase_price as number) ?? (prod.average_purchase_price as number) ?? (prod.purchase_price as number) ?? 0,
          sale_price: i.sale_price as number,
          stock_quantity: (prod.stock_quantity as number) ?? 0,
          category_id: (prod.category_id as string) ?? '',
          quantity: i.quantity as number,
          returned_quantity: (i.returned_quantity as number) ?? 0,
        };
      });
      return {
        id: o.id as string,
        total: o.total as number,
        paid_amount: (o.paid_amount as number) ?? (o.total as number),
        type: (o.type as string) as 'sale' | 'payment' ?? 'sale',
        payment_method: (o.payment_method as any) ?? 'cash',
        date: o.created_at as string,
        items,
        customer: custRow
          ? { id: custRow.id as string, name: custRow.name as string, phone: custRow.phone as string, timestamp: custRow.created_at as string }
          : undefined,
      };
    });

    return orders;
  },

  updateSettings: async (newSettings) => {
    const mapped: Record<string, unknown> = {};
    if (newSettings.name !== undefined) mapped.name = newSettings.name;
    if (newSettings.currency !== undefined) mapped.currency = newSettings.currency;
    if (newSettings.logo !== undefined) mapped.logo = newSettings.logo;
    if (newSettings.taxRate !== undefined) mapped.tax_rate = newSettings.taxRate;
    if (newSettings.themeColor !== undefined) mapped.theme_color = newSettings.themeColor;
    if (newSettings.address !== undefined) mapped.address = newSettings.address;
    if (newSettings.phone !== undefined) mapped.phone = newSettings.phone;
    if (newSettings.phone2 !== undefined) mapped.phone2 = newSettings.phone2;
    if (newSettings.whatsappCountryCode !== undefined) mapped.whatsapp_country_code = newSettings.whatsappCountryCode;
    if (newSettings.initial_balance !== undefined) mapped.initial_balance = newSettings.initial_balance;

    const { data: existing } = await supabase.from('store_settings').select('id').limit(1).maybeSingle();
    
    if (existing?.id) {
      await supabase.from('store_settings').update(mapped).eq('id', existing.id);
    } else {
      await supabase.from('store_settings').insert(mapped);
    }
    
    set((state) => ({ storeSettings: { ...state.storeSettings, ...newSettings } }));
    new BroadcastChannel('cashier-sync').postMessage('sync_settings');
  },

  addProduct: async (product) => {
    const { data } = await supabase.from('products').insert(product).select().single();
    if (data) set((state) => ({ products: [data as unknown as Product, ...state.products] }));
  },

  updateProduct: async (id, updated) => {
    await supabase.from('products').update(updated).eq('id', id);
    set((state) => ({ products: state.products.map((p) => (p.id === id ? { ...p, ...updated } : p)) }));
  },

  deleteProduct: async (id) => {
    await supabase.from('products').delete().eq('id', id);
    set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
  },

  // ── Expenses ──────────────────────────────────────────────
  addExpense: async (expense) => {
    const { data, error } = await supabase.from('expenses').insert({
      category: expense.category,
      amount: expense.amount,
      note: expense.note,
      payment_method: expense.payment_method
    }).select().single();
    
    if (error) {
      console.error("Add Expense Error:", error);
      return;
    }

    if (data) {
      const newExp: Expense = {
        id: (data as any).id,
        category: (data as any).category,
        amount: (data as any).amount,
        note: (data as any).note,
        payment_method: (data as any).payment_method,
        date: (data as any).created_at
      };
      set((state) => ({ expenses: [newExp, ...state.expenses] }));
    }
  },

  updateExpense: async (id, expense) => {
    const { data, error } = await supabase.from('expenses').update({
      category: expense.category,
      amount: expense.amount,
      note: expense.note,
      payment_method: expense.payment_method
    }).eq('id', id).select().single();

    if (error) {
      console.error("Update Expense Error:", error);
      return;
    }

    if (data) {
      set((state) => ({
        expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...expense } : e))
      }));
    }
  },

  deleteExpense: async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id);
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));
  },

  // ── Suppliers ─────────────────────────────────────────────
  addSupplier: async (supplier) => {
    const { data, error } = await supabase.from('suppliers').insert(supplier).select().single();
    if (error) {
      console.error("Add Supplier Error:", error);
      return;
    }
    if (data) {
      set((state) => ({ suppliers: [data as unknown as Supplier, ...state.suppliers] }));
    }
  },

  updateSupplier: async (id, updated) => {
    const { data, error } = await supabase.from('suppliers').update(updated).eq('id', id).select().single();
    if (error) {
      console.error("Update Supplier Error:", error);
      return;
    }
    if (data) {
      set((state) => ({ suppliers: state.suppliers.map((s) => (s.id === id ? { ...s, ...updated } : s)) }));
    }
  },

  deleteSupplier: async (id) => {
    await supabase.from('suppliers').delete().eq('id', id);
    set((state) => ({ suppliers: state.suppliers.filter((s) => s.id !== id) }));
  },

  // ── Purchases ─────────────────────────────────────────────
  loadPurchaseInvoices: async () => {
    try {
      const { data } = await supabase.from('purchase_invoices').select('*, purchase_items(*)').order('created_at', { ascending: false });
      if (data) {
        const mapped = (data as any[]).map(inv => ({
          ...inv,
          items: inv.purchase_items || []
        }));
        set({ purchaseInvoices: mapped as PurchaseInvoice[] });
      }
    } catch (e) {
      console.error(e);
    }
  },

  addPurchaseInvoice: async (invoice, items) => {
    const state = get();
    // 1. Insert Invoice
    const { data: invData, error: invError } = await supabase
      .from('purchase_invoices')
      .insert({
        invoice_number: invoice.invoice_number,
        supplier_id: invoice.supplier_id,
        total: invoice.total,
        paid_amount: invoice.paid_amount,
        payment_method: invoice.payment_method
      })
      .select()
      .single();

    if (invError) {
      console.error("Add Purchase Invoice Error:", invError);
      throw new Error(`خطأ في حفظ الفاتورة: ${invError.message}`);
    }

    const newInvoiceId = (invData as any).id;

    // 2. Insert Items
    const itemsToInsert = items.map(item => ({
      invoice_id: newInvoiceId,
      product_id: item.product_id,
      quantity: item.quantity,
      purchase_price: item.purchase_price
    }));

    const { error: itemsError } = await supabase.from('purchase_items').insert(itemsToInsert);
    if (itemsError) {
      console.error("Add Purchase Items Error:", itemsError);
      throw new Error(`خطأ في حفظ أصناف الفاتورة: ${itemsError.message}`);
    }

    // 3. Update stock and average price for each product
    const updatedProducts = [...state.products];
    for (const item of items) {
      const productIndex = updatedProducts.findIndex(p => p.id === item.product_id);
      if (productIndex !== -1) {
        const product = updatedProducts[productIndex];
        const oldQty = product.stock_quantity;
        const oldAvgPrice = product.average_purchase_price || product.purchase_price || 0;
        
        const newQty = oldQty + item.quantity;
        const newTotalValue = (oldQty * oldAvgPrice) + (item.quantity * item.purchase_price);
        const newAvgPrice = newQty > 0 ? newTotalValue / newQty : 0;

        // Update DB
        await supabase.from('products').update({
          stock_quantity: newQty,
          average_purchase_price: newAvgPrice,
          purchase_price: item.purchase_price
        }).eq('id', product.id);

        // Update local state copy
        updatedProducts[productIndex] = {
          ...product,
          stock_quantity: newQty,
          average_purchase_price: newAvgPrice,
          purchase_price: item.purchase_price
        };
      }
    }

    // 4. Update local state
    const completeInvoice: PurchaseInvoice = {
      ...invData as any,
      items
    };

    set({
      purchaseInvoices: [completeInvoice, ...state.purchaseInvoices],
      products: updatedProducts
    });
  },

  paySupplierDebt: async (supplierId, amount) => {
    // We'll create a special purchase invoice for payment (type or negative total? no, let's just add to paid_amount of oldest invoices)
    // Actually, a cleaner way is to have a payments table. 
    // But for now, we'll find invoices with debt for this supplier and update them.
    
    let remainingAmount = amount;
    const { data: invoices } = await supabase
      .from('purchase_invoices')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: true });

    if (invoices) {
      for (const inv of invoices) {
        if (remainingAmount <= 0) break;
        const debt = inv.total - inv.paid_amount;
        if (debt > 0) {
          const payment = Math.min(remainingAmount, debt);
          const newPaid = inv.paid_amount + payment;
          await supabase.from('purchase_invoices').update({ paid_amount: newPaid }).eq('id', inv.id);
          remainingAmount -= payment;
        }
      }
    }

    // Refresh data
    await get().loadPurchaseInvoices();
  },
}));
