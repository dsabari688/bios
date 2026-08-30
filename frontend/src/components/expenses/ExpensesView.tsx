import React, { useState, useRef } from "react";
import { Plus, Wallet, FileText, Upload, Sparkles, Check, CheckCircle2, ChevronRight, Calendar, Edit2, AlertTriangle, MessageSquare } from "lucide-react";
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
  { value: "food", label: "Food & Dining", color: "bg-orange-50 text-orange-600 border-orange-100", barColor: "bg-orange-500" },
  { value: "transportation", label: "Transportation", color: "bg-blue-50 text-blue-600 border-blue-100", barColor: "bg-blue-500" },
  { value: "shopping", label: "Shopping & Goods", color: "bg-purple-50 text-purple-600 border-purple-100", barColor: "bg-purple-500" },
  { value: "education", label: "Education & Growth", color: "bg-amber-50 text-amber-650 border-amber-100", barColor: "bg-amber-500" },
  { value: "healthcare", label: "Healthcare", color: "bg-emerald-50 text-emerald-600 border-emerald-100", barColor: "bg-emerald-500" },
  { value: "entertainment", label: "Entertainment", color: "bg-rose-50 text-rose-600 border-rose-100", barColor: "bg-rose-500" },
  { value: "misc", label: "Miscellaneous", color: "bg-slate-50 text-slate-600 border-slate-100", barColor: "bg-slate-500" }
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
  const [category, setCategory] = useState("misc");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isImpulsive, setIsImpulsive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

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

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setIsScanning(true);
    setScanResult("Analyzing receipt pixels...");

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
        setScanResult("Scan complete! Prefilled form values.");
      } else {
        setScanResult("Receipt scan failed. Fell back to simulation defaults.");
      }
    } catch (err) {
      console.error(err);
      setScanResult("Offline or scan error. Manual prefill fallback.");
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanResult(null), 4000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) return;

    await onAddExpense({
      amount: parseFloat(amount),
      category,
      note,
      date,
      isImpulsive
    });

    setAmount("");
    setNote("");
    setIsImpulsive(false);
    setDate(new Date().toISOString().split("T")[0]);
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

  // Sort months descending
  const sortedMonths = Object.keys(groupedExpenses).sort((a, b) => String(b || "").localeCompare(String(a || "")));

  return (
    <div className="space-y-6 pb-24">
      {/* Title Header */}
      <div>
        <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight">Financial Cockpit</h2>
        <p className="text-xs text-slate-500 font-sans mt-0.5">Audit expenses, maintain budget coherence, and reflect on impulsive decisions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* New Expense Form Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Wallet className="w-4.5 h-4.5 text-amber-500" />
                <span>Log New Expense</span>
              </div>
              
              {/* Receipt Upload trigger */}
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
                  className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100/50 text-amber-850 text-[10px] font-mono font-bold rounded-lg border border-amber-200/50 cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-55"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isScanning ? "Scanning Receipt..." : "Upload Receipt Scan"}
                </button>
              </div>
            </div>

            {scanResult && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-[11px] font-mono text-amber-750 animate-pulse">
                {scanResult}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-semibold">₹</span>
                  <input
                    type="text"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-7 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {categoriesList.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Note / Merchant</label>
                <input
                  type="text"
                  placeholder="e.g. Stark Labs Equipment"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Impulsive checkbox */}
              <div className="md:col-span-2 flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isImpulsive"
                  checked={isImpulsive}
                  onChange={(e) => setIsImpulsive(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4 border-slate-300 cursor-pointer"
                />
                <label htmlFor="isImpulsive" className="text-xs font-semibold text-slate-650 cursor-pointer select-none flex items-center gap-1">
                  Mark as Impulsive Purchase
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline" />
                </label>
              </div>

              <div className="md:col-span-2 flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-display font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer max-w-fit active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 text-amber-500 stroke-3" />
                  Commit Transaction
                </button>
              </div>
            </form>
          </div>

          {/* Past Expenses List */}
          <div className="space-y-4">
            <h3 className="font-display font-black text-slate-800 text-sm">Transaction Ledger History</h3>
            
            {sortedMonths.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">
                No telemetry expense logs registered.
              </div>
            ) : (
              sortedMonths.map((month) => {
                // Parse month title (e.g. "2026-06" -> "June 2026")
                const [y, m] = month.split("-");
                const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
                const monthTitle = dateObj.toLocaleString("default", { month: "long", year: "numeric" });
                
                const monthExpenses = groupedExpenses[month].sort((a, b) => {
                  const aDate = String(a?.date || (a as any)?.transactionDate || "");
                  const bDate = String(b?.date || (b as any)?.transactionDate || "");
                  return bDate.localeCompare(aDate);
                });

                return (
                  <div key={month} className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
                    <h4 className="font-display font-bold text-slate-900 text-sm border-b border-slate-50 pb-2">{monthTitle}</h4>
                    
                    <div className="divide-y divide-slate-100 space-y-3">
                      {monthExpenses.map((exp) => {
                        const catDetail = categoriesList.find((c) => c.value === exp.category) || { label: "Misc", color: "bg-slate-50 text-slate-500 border-slate-150" };
                        const limit = getCategoryBudgetLimit(exp.category);
                        const totalSpent = getCategorySpend(exp.category);
                        const isOverBudget = limit > 0 && totalSpent > limit;

                        return (
                          <div key={exp.id} className="pt-3.5 flex flex-col gap-2 transition-all">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="min-w-0">
                                  <span className="font-display font-bold text-xs text-slate-800 block">
                                    {exp.note || "Uncategorized purchase"}
                                  </span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="font-mono text-[9px] text-slate-400">{exp.date}</span>
                                    <span className={`text-[8px] font-mono font-bold px-2 py-0.2 rounded-full border ${catDetail.color}`}>
                                      {catDetail.label}
                                    </span>
                                    {exp.isImpulsive && (
                                      <span className="bg-amber-50 border border-amber-100 text-amber-700 px-2 py-0.2 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider">
                                        Impulsive
                                      </span>
                                    )}
                                    {isOverBudget && (
                                      <span className="bg-rose-50 border border-rose-100 text-rose-600 px-2 py-0.2 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider">
                                        Over Budget
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono font-extrabold text-sm text-slate-900 shrink-0">
                                -₹{exp.amount.toFixed(2)}
                              </span>
                            </div>

                            {/* Show Explanation Reflection UI if required */}
                            {(exp.isImpulsive || isOverBudget) && (
                              <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100/60 mt-1">
                                {exp.explanation ? (
                                  <div className="flex gap-2 items-start text-xs text-slate-650">
                                    <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                    <p className="italic">"{exp.explanation}"</p>
                                  </div>
                                ) : explainingExpenseId === exp.id ? (
                                  <div className="space-y-2">
                                    <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase">Input butler reflection / reason:</label>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        placeholder="e.g. Needed it for an upcoming study project."
                                        value={explanationText}
                                        onChange={(e) => setExplanationText(e.target.value)}
                                        className="flex-1 px-3 py-1 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-xs"
                                      />
                                      <button
                                        onClick={() => handleExplainSubmit(exp.id)}
                                        className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                      >
                                        Log
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-medium italic flex items-center gap-1.5">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                      Auditing explanation required
                                    </span>
                                    <button
                                      onClick={() => {
                                        setExplainingExpenseId(exp.id);
                                        setExplanationText("");
                                      }}
                                      className="px-2 py-0.8 bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono text-[9px] font-black uppercase tracking-wider rounded-md transition-colors cursor-pointer"
                                    >
                                      Explain
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

        {/* Right Column: Budgets Progress Cockpit */}
        <div className="space-y-6">
          {/* Progress Bars */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-5">
            <h3 className="font-display font-bold text-slate-800 text-sm">Budget Allowances</h3>
            
            <div className="space-y-4">
              {categoriesList.map((cat) => {
                const totalSpent = getCategorySpend(cat.value);
                const limit = getCategoryBudgetLimit(cat.value);
                const ratio = limit > 0 ? (totalSpent / limit) : 0;
                const ratioPercent = Math.min(Math.round(ratio * 100), 100);
                const isOver = totalSpent > limit && limit > 0;

                return (
                  <div key={cat.value} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      <span>{cat.label}</span>
                      <span className="font-mono">
                        ₹{totalSpent.toFixed(2)} / <span className="text-slate-405">₹{limit.toFixed(2)}</span>
                      </span>
                    </div>
                    
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
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

          {/* Adjust budget limits form */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
            <h3 className="font-display font-bold text-slate-800 text-sm">Update Allowances Limits</h3>
            
            <form onSubmit={handleBudgetSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Category</label>
                <select
                  value={editingBudgetCategory}
                  onChange={(e) => setEditingBudgetCategory(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-705 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                  required
                >
                  <option value="">-- Choose Category --</option>
                  {categoriesList.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">New Monthly Limit (₹)</label>
                <input
                  type="text"
                  required
                  placeholder="250.00"
                  value={editingBudgetLimit}
                  onChange={(e) => setEditingBudgetLimit(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-slate-950 hover:bg-slate-905 border border-transparent text-white font-display font-bold text-[10px] uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-[0.98]"
              >
                <Check className="w-3.5 h-3.5 text-amber-500 stroke-3" />
                Commit Limit updates
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

