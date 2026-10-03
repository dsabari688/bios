import React, { useState, useRef } from "react";
import { Plus, Wallet, Upload, Check, AlertTriangle, MessageSquare, Receipt, Sparkles } from "lucide-react";
import { Expense, CategoryBudget } from "../../types";
import { getApiBaseUrl } from "../../api/client";

interface ExpensesViewProps {
  expenses: Expense[];
  budgets: CategoryBudget[];
  token: string | null;
  onAddExpense: (data: { amount: number; category: string; note: string; date: string; isImpulsive?: boolean }) => Promise<void>;
  onUpdateBudget: (category: string, limit: number) => Promise<void>;
  onExplainExpense: (id: string, explanation: string) => Promise<void>;
}

const categoriesList = [
  { value: "food", label: "Food & Dining", icon: "🍔", color: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-800/40", barColor: "bg-orange-500" },
  { value: "transportation", label: "Transportation", icon: "🚗", color: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800/40", barColor: "bg-blue-500" },
  { value: "shopping", label: "Shopping & Goods", icon: "🛍️", color: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800/40", barColor: "bg-purple-500" },
  { value: "education", label: "Education & Growth", icon: "📚", color: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/40", barColor: "bg-amber-500" },
  { value: "healthcare", label: "Healthcare", icon: "💊", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40", barColor: "bg-emerald-500" },
  { value: "entertainment", label: "Entertainment", icon: "🎬", color: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/40", barColor: "bg-rose-500" },
  { value: "misc", label: "Miscellaneous", icon: "📦", color: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700/50", barColor: "bg-slate-500" }
];

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses = [],
  budgets = [],
  token,
  onAddExpense,
  onUpdateBudget,
  onExplainExpense
}) => {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isImpulsive, setIsImpulsive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Budget Adjuster State
  const [editingBudgetCategory, setEditingBudgetCategory] = useState("");
  const [editingBudgetLimit, setEditingBudgetLimit] = useState("");

  // Explanation state
  const [explainingExpenseId, setExplainingExpenseId] = useState<string | null>(null);
  const [explanationText, setExplanationText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate totals per category for the CURRENT month
  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"

  const getCategorySpend = (cat: string) => {
    return expenses
      .filter((e) => {
        const d = e.date || (e as any).transactionDate || "";
        return e.category === cat && d.substring(0, 7) === currentMonthStr;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  };

  const getCategoryBudgetLimit = (cat: string) => {
    const budget = budgets.find((b) => b.category === cat);
    return budget ? budget.limit : 0;
  };

  const totalSpentThisMonth = expenses
    .filter((e) => {
      const d = e.date || (e as any).transactionDate || "";
      return d.substring(0, 7) === currentMonthStr;
    })
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const totalBudgetLimit = budgets.reduce((sum, b) => sum + (b.limit || 0), 0);

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setIsScanning(true);
    setScanResult("Scanning receipt...");

    const formData = new FormData();
    formData.append("receipt", file);

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/expenses/scan-receipt`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.amount) setAmount(data.amount.toString());
        if (data.category) setCategory(data.category);
        if (data.note) setNote(data.note);
        if (data.date) setDate(data.date);
        setScanResult("Receipt details filled into form!");
      } else {
        setScanResult("Could not parse receipt. Please enter details manually.");
      }
    } catch (err) {
      console.error(err);
      setScanResult("Scan error. Please enter details manually.");
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanResult(null), 4000);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await onAddExpense({
        amount: parsedAmount,
        category,
        note: note.trim() || categoriesList.find((c) => c.value === category)?.label || "Expense",
        date,
        isImpulsive
      });

      setAmount("");
      setNote("");
      setIsImpulsive(false);
      setDate(new Date().toISOString().split("T")[0]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudgetCategory || !editingBudgetLimit || isNaN(parseFloat(editingBudgetLimit))) return;

    await onUpdateBudget(editingBudgetCategory, parseFloat(editingBudgetLimit));
    setEditingBudgetCategory("");
    setEditingBudgetLimit("");
  };

  const handleExplainSubmit = async (expenseId: string) => {
    if (!explanationText.trim()) return;
    await onExplainExpense(expenseId, explanationText.trim());
    setExplainingExpenseId(null);
    setExplanationText("");
  };

  // Group expenses by Month for display
  const groupedExpenses: Record<string, Expense[]> = {};
  expenses.forEach((e) => {
    const d = e.date || (e as any).transactionDate || new Date().toISOString();
    const month = d.substring(0, 7); // YYYY-MM
    if (!groupedExpenses[month]) groupedExpenses[month] = [];
    groupedExpenses[month].push(e);
  });

  const sortedMonths = Object.keys(groupedExpenses).sort((a, b) => String(b || "").localeCompare(String(a || "")));

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto">
      {/* Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 tracking-tight">Expenses & Budget</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">Track daily spending and manage monthly category allowances.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-2 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Spent This Month</span>
            <span className="text-base font-extrabold font-mono text-slate-900 dark:text-slate-100">₹{totalSpentThisMonth.toFixed(2)}</span>
          </div>
          {totalBudgetLimit > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-2 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Total Budget</span>
              <span className="text-base font-extrabold font-mono text-slate-600 dark:text-slate-300">₹{totalBudgetLimit.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Log Form & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Simple Log Expense Form Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-sm">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center">
                  <Wallet className="w-4.5 h-4.5" />
                </div>
                <span>Log Expense</span>
              </div>

              {/* Minimal Receipt Scan Button */}
              <div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleReceiptUpload} 
                  accept="image/*"
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-lg border border-slate-200/80 dark:border-slate-700 cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-50"
                  title="Scan a receipt image using AI"
                >
                  <Receipt className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isScanning ? "Scanning..." : "Scan Receipt"}</span>
                </button>
              </div>
            </div>

            {scanResult && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 animate-in fade-in">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{scanResult}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Amount Field */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* Category Field */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer transition-all"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat.value} value={cat.value} className="dark:bg-slate-900 dark:text-slate-100">
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Note / Description */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Lunch, Groceries, Metro ride"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              {/* Footer Row: Impulsive toggle + Add Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={isImpulsive}
                    onChange={(e) => setIsImpulsive(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4 border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                  />
                  <span>Unplanned / Impulsive buy</span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? "Adding..." : "Add Expense"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Past Expenses List */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-200 text-sm">Recent Expenses</h3>
            
            {sortedMonths.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs">
                No expenses logged yet.
              </div>
            ) : (
              sortedMonths.map((month) => {
                const [y, m] = month.split("-");
                const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
                const monthTitle = dateObj.toLocaleString("default", { month: "long", year: "numeric" });
                
                const monthExpenses = groupedExpenses[month].sort((a, b) => {
                  const aDate = String(a?.date || (a as any)?.transactionDate || "");
                  const bDate = String(b?.date || (b as any)?.transactionDate || "");
                  return bDate.localeCompare(aDate);
                });

                return (
                  <div key={month} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-4">
                    <h4 className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
                      {monthTitle}
                    </h4>
                    
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-2.5">
                      {monthExpenses.map((exp) => {
                        const catDetail = categoriesList.find((c) => c.value === exp.category) || { label: "Misc", icon: "📦", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200" };
                        const limit = getCategoryBudgetLimit(exp.category);
                        const totalSpent = getCategorySpend(exp.category);
                        const isOverBudget = limit > 0 && totalSpent > limit;

                        return (
                          <div key={exp.id} className="pt-2.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-sm shrink-0">
                                  {catDetail.icon}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 block truncate">
                                    {exp.note || "Expense"}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                    <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{exp.date}</span>
                                    <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full border ${catDetail.color}`}>
                                      {catDetail.label}
                                    </span>
                                    {exp.isImpulsive && (
                                      <span className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full text-[9px] font-medium">
                                        Impulsive
                                      </span>
                                    )}
                                    {isOverBudget && (
                                      <span className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full text-[9px] font-medium">
                                        Over Budget
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 shrink-0">
                                -₹{exp.amount.toFixed(2)}
                              </span>
                            </div>

                            {/* Reflection UI if required */}
                            {(exp.isImpulsive || isOverBudget) && (
                              <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800/60 mt-0.5">
                                {exp.explanation ? (
                                  <div className="flex gap-2 items-start text-xs text-slate-600 dark:text-slate-400">
                                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                    <p className="italic">"{exp.explanation}"</p>
                                  </div>
                                ) : explainingExpenseId === exp.id ? (
                                  <div className="space-y-2">
                                    <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">Reflection / reason for purchase:</label>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        placeholder="e.g. Needed it for project work"
                                        value={explanationText}
                                        onChange={(e) => setExplanationText(e.target.value)}
                                        className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-amber-500 text-xs text-slate-800 dark:text-slate-200"
                                      />
                                      <button
                                        onClick={() => handleExplainSubmit(exp.id)}
                                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 dark:text-slate-400 italic flex items-center gap-1.5 text-[11px]">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                      Add reflection note
                                    </span>
                                    <button
                                      onClick={() => {
                                        setExplainingExpenseId(exp.id);
                                        setExplanationText("");
                                      }}
                                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-[10px] uppercase tracking-wider rounded-md transition-colors cursor-pointer"
                                    >
                                      Add Note
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Budgets Progress & Adjustment */}
        <div className="space-y-6">
          {/* Category Budgets Progress */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-4">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 text-sm">Monthly Budgets</h3>
            
            <div className="space-y-3.5">
              {categoriesList.map((cat) => {
                const totalSpent = getCategorySpend(cat.value);
                const limit = getCategoryBudgetLimit(cat.value);
                const ratio = limit > 0 ? (totalSpent / limit) : 0;
                const ratioPercent = Math.min(Math.round(ratio * 100), 100);
                const isOver = totalSpent > limit && limit > 0;

                return (
                  <div key={cat.value} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        ₹{totalSpent.toFixed(2)} {limit > 0 ? `/ ₹${limit.toFixed(2)}` : ""}
                      </span>
                    </div>
                    
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                      <div 
                        className={`h-full ${isOver ? "bg-rose-500" : cat.barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${limit > 0 ? ratioPercent : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Set / Update Budget Limits */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-4">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 text-sm">Set Category Budget</h3>
            
            <form onSubmit={handleBudgetSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Category</label>
                <select
                  value={editingBudgetCategory}
                  onChange={(e) => setEditingBudgetCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
                  required
                >
                  <option value="">-- Choose Category --</option>
                  {categoriesList.map((cat) => (
                    <option key={cat.value} value={cat.value} className="dark:bg-slate-900 dark:text-slate-100">
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Monthly Limit (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="e.g. 5000"
                  value={editingBudgetLimit}
                  onChange={(e) => setEditingBudgetLimit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Check className="w-3.5 h-3.5 text-amber-500" />
                <span>Save Budget</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
