
import React, { useState, useEffect } from 'react';
import { BillItem, User, AppFlow } from '@/types';

interface ItemSplitterProps {
  items: BillItem[];
  selectedMembers: User[];
  tax: number;
  discount: number;
  otherCharges: number;
  flow: AppFlow;
  onChange: (items: BillItem[], tax: number, discount: number, otherCharges: number) => void;
}

export const ItemSplitter: React.FC<ItemSplitterProps> = ({
  items,
  selectedMembers,
  tax,
  discount,
  otherCharges,
  flow,
  onChange,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(items[0]?.id || null);
  const [entryMode, setEntryMode] = useState<'itemized' | 'quick'>(
    items.length <= 1 && flow === AppFlow.MANUAL ? 'quick' : 'itemized'
  );

  // Initialize quick mode with a total item if in manual flow and no items exist
  useEffect(() => {
    if (flow === AppFlow.MANUAL && items.length === 0 && entryMode === 'quick') {
      const quickItem: BillItem = {
        id: 'quick-total',
        name: 'Total Bill',
        price: 0,
        quantity: 1,
        splitType: 'equally',
        splitMemberIds: selectedMembers.map(m => m.id),
        quantityAssignments: {},
      };
      onChange([quickItem], tax, discount, otherCharges);
      setExpandedId('quick-total');
    }
  }, [flow, items.length, entryMode, onChange, selectedMembers, tax, discount, otherCharges]);

  const updateItem = (id: string, updates: Partial<BillItem>) => {
    const newItems = items.map(item => item.id === id ? { ...item, ...updates } : item);
    onChange(newItems, tax, discount, otherCharges);
  };

  const addItem = () => {
    const newItem: BillItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: entryMode === 'quick' ? 'Total Bill' : 'New Item',
      price: 0,
      quantity: 1,
      splitType: 'equally',
      splitMemberIds: selectedMembers.map(m => m.id),
      quantityAssignments: {},
    };
    onChange([...items, newItem], tax, discount, otherCharges);
    setExpandedId(newItem.id);
  };

  const removeItem = (id: string) => {
    const newItems = items.filter(i => i.id !== id);
    onChange(newItems, tax, discount, otherCharges);
    if (expandedId === id) setExpandedId(null);
  };

  const toggleMemberForItem = (itemId: string, memberId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (item.splitType === 'quantity') {
      const currentAssignments = item.quantityAssignments || {};
      const newAssignments = { ...currentAssignments };

      if (newAssignments[memberId]) {
        delete newAssignments[memberId];
      } else {
        newAssignments[memberId] = 1;
      }

      const newIds = Object.keys(newAssignments);
      updateItem(itemId, {
        quantityAssignments: newAssignments,
        splitMemberIds: newIds.length > 0 ? newIds : item.splitMemberIds
      });
      return;
    }

    let newIds = [...item.splitMemberIds];
    if (newIds.includes(memberId)) {
      if (newIds.length > 1) {
        newIds = newIds.filter(id => id !== memberId);
      } else {
        alert('At least one member must be selected.');
        return;
      }
    } else {
      newIds.push(memberId);
    }
    updateItem(itemId, { splitMemberIds: newIds, splitType: 'custom' });
  };

  const updateQuantityAssignment = (itemId: string, memberId: string, value: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const currentAssignments = item.quantityAssignments || {};
    const newAssignments = { ...currentAssignments, [memberId]: Math.max(0, value) };

    if (newAssignments[memberId] === 0) {
      delete newAssignments[memberId];
    }

    const newIds = Object.keys(newAssignments);
    updateItem(itemId, {
      quantityAssignments: newAssignments,
      splitMemberIds: newIds.length > 0 ? newIds : [selectedMembers[0].id]
    });
  };

  const handleModeChange = (mode: 'itemized' | 'quick') => {
    setEntryMode(mode);
    if (mode === 'quick') {
      const totalItemsPrice = items.reduce((sum, i) => sum + i.price, 0);
      const quickItem: BillItem = {
        id: 'quick-total',
        name: 'Total Bill',
        price: totalItemsPrice,
        quantity: 1,
        splitType: 'equally',
        splitMemberIds: selectedMembers.map(m => m.id),
        quantityAssignments: {},
      };
      onChange([quickItem], tax, discount, otherCharges);
      setExpandedId('quick-total');
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const calculatedTotal = subtotal + tax + otherCharges - discount;

  return (
    <div className="space-y-5 pb-24 animate-slide-up">
      {flow === AppFlow.SCAN && (
        <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl flex gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 shrink-0">
            <i className="fas fa-wand-magic-sparkles text-xs"></i>
          </div>
          <p className="text-xs text-amber-900 dark:text-amber-400 leading-relaxed font-medium">
            Verify extracted items carefully. AI may misread handwritten or blurry receipts.
          </p>
        </div>
      )}

      {flow === AppFlow.MANUAL && (
        <div className="flex p-1.5 bg-gray-50 dark:bg-slate-700/50 rounded-2xl">
          <button
            onClick={() => handleModeChange('quick')}
            style={{ WebkitTapHighlightColor: 'transparent', outline: 'none', boxShadow: 'none' }}
            className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all focus:outline-none focus:ring-0 outline-none ring-0 !min-h-0 h-auto ${entryMode === 'quick' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-400 dark:text-slate-400'
              }`}
          >
            Quick Total
          </button>
          <button
            onClick={() => handleModeChange('itemized')}
            style={{ WebkitTapHighlightColor: 'transparent', outline: 'none', boxShadow: 'none' }}
            className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all focus:outline-none focus:ring-0 outline-none ring-0 !min-h-0 h-auto ${entryMode === 'itemized' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-400 dark:text-slate-400'
              }`}
          >
            Itemized
          </button>
        </div>
      )}

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className={`group bg-white dark:bg-slate-800 rounded-3xl border transition-all duration-300 ${expandedId === item.id
            ? 'border-transparent'
            : 'border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600 shadow-sm'
            }`}>
            <div
              className="p-5 flex items-center justify-between cursor-pointer focus:outline-none"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
            >
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 mb-1">
                  {expandedId === item.id ? (
                    <textarea
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Item name..."
                      className="font-bold text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 w-full text-base !min-h-0 !p-0 resize-none break-words"
                      title={item.name}
                      rows={1}
                      style={{
                        minHeight: '1.5rem',
                        lineHeight: '1.5rem',
                        maxHeight: '6rem',
                        overflowY: 'auto',
                        wordWrap: 'break-word',
                        wordBreak: 'break-word'
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${Math.min(target.scrollHeight, 96)}px`;
                      }}
                      onFocus={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${Math.min(target.scrollHeight, 96)}px`;
                      }}
                      ref={(textarea) => {
                        if (textarea) {
                          textarea.style.height = 'auto';
                          textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
                        }
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Item name..."
                      className="font-bold text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 w-full truncate text-base !min-h-0 !p-0"
                      title={item.name}
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${item.splitType === 'quantity'
                    ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
                    : item.splitMemberIds.length === selectedMembers.length
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                    }`}>
                    {item.splitType === 'quantity' ? 'Split by Qty' : item.splitMemberIds.length === selectedMembers.length ? 'Split All' : `${item.splitMemberIds.length} members`}
                  </span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                    Qty: {item.quantity || 1}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-gray-50/80 dark:bg-slate-700/50 px-2 py-2 rounded-xl border border-gray-100 dark:border-slate-700 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                  <span className="text-gray-400 dark:text-slate-500 text-xs font-bold mr-1">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={item.price || ''}
                    onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                    onClick={(e) => e.stopPropagation()}
                    className="w-14 font-black text-gray-900 dark:text-white border-none focus:ring-0 text-right bg-transparent !min-h-0 !p-0"
                  />
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${expandedId === item.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rotate-180' : 'text-gray-300 dark:text-slate-600'
                  }`}>
                  <i className="fas fa-chevron-down text-[10px]"></i>
                </div>
              </div>
            </div>

            {expandedId === item.id && (
              <div className="px-5 pb-5 border-t border-gray-50 dark:border-slate-700 pt-5 animate-slide-up">
                <div className="flex flex-col gap-6">
                  {/* Top Bar: Settings */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-700/50 p-1.5 rounded-2xl">
                      <button
                        onClick={() => updateItem(item.id, { splitType: 'equally', splitMemberIds: selectedMembers.map(m => m.id) })}
                        style={{ WebkitTapHighlightColor: 'transparent', outline: 'none', boxShadow: 'none' }}
                        className={`text-[10px] px-3 py-2 rounded-xl font-bold transition-all focus:outline-none focus:ring-0 outline-none ring-0 !min-h-0 ${item.splitType === 'equally' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-400'}`}
                      >
                        Equal
                      </button>
                      <button
                        onClick={() => updateItem(item.id, { splitType: 'quantity', quantityAssignments: item.quantityAssignments || {} })}
                        style={{ WebkitTapHighlightColor: 'transparent', outline: 'none', boxShadow: 'none' }}
                        className={`text-[10px] px-3 py-2 rounded-xl font-bold transition-all focus:outline-none focus:ring-0 outline-none ring-0 !min-h-0 ${item.splitType === 'quantity' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-400'}`}
                      >
                        By Qty
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900/50 px-3 py-1 rounded-xl">
                        <span className="text-[9px] font-black text-gray-400 uppercase">Qty</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                          style={{ outline: 'none', boxShadow: 'none' }}
                          className="w-8 text-center text-xs font-black bg-transparent border-none focus:ring-0 dark:text-white !min-h-0 !p-0"
                        />
                      </div>
                      {entryMode === 'itemized' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                          className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors focus:outline-none focus:ring-0 !min-h-0 !p-0"
                        >
                          <i className="fas fa-trash-alt text-xs"></i>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Split Method UI */}
                  {item.splitType === 'quantity' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assign Units</span>
                        <span className="text-[9px] font-bold text-indigo-500">Total: {(Object.values(item.quantityAssignments || {}) as number[]).reduce((a, b) => a + b, 0).toFixed(2)} / {item.quantity}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">Use decimals to share a unit (e.g. 0.5 each for two people).</p>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedMembers.map(member => {
                          const assigned = item.quantityAssignments?.[member.id] ?? 0;
                          return (
                            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-slate-900/30 rounded-2xl border border-gray-100/50 dark:border-slate-800">
                              <div className="flex items-center gap-3 min-w-0">
                                <img src={member.avatar} className="w-8 h-8 rounded-lg shrink-0" alt="" />
                                <span className="text-xs font-bold text-gray-700 dark:text-slate-300 truncate">{member.name}</span>
                              </div>
                              <div className="flex items-center gap-2 bg-gray-50/80 dark:bg-slate-700/50 px-2 py-2 rounded-xl border border-gray-100 dark:border-slate-700 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => updateQuantityAssignment(item.id, member.id, Math.max(0, assigned - 1))}
                                  style={{ WebkitTapHighlightColor: 'transparent', outline: 'none', boxShadow: 'none' }}
                                  className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-indigo-500 transition-colors focus:outline-none focus:ring-0 !min-h-0 !p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                                >
                                  <i className="fas fa-minus text-[10px]" aria-hidden />
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.25}
                                  value={assigned}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw === '') {
                                      updateQuantityAssignment(item.id, member.id, 0);
                                      return;
                                    }
                                    const n = parseFloat(raw);
                                    if (!Number.isNaN(n) && n >= 0) updateQuantityAssignment(item.id, member.id, n);
                                  }}
                                  onBlur={(e) => {
                                    if (e.target.value === '') updateQuantityAssignment(item.id, member.id, 0);
                                  }}
                                  className="w-8 text-xs font-black text-center text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 !min-h-0 !p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  aria-label={`Units for ${member.name}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => updateQuantityAssignment(item.id, member.id, assigned + 1)}
                                  style={{ WebkitTapHighlightColor: 'transparent', outline: 'none', boxShadow: 'none' }}
                                  className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-indigo-500 transition-colors focus:outline-none focus:ring-0 !min-h-0 !p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                                >
                                  <i className="fas fa-plus text-[10px]" aria-hidden />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-400 uppercase tracking-widest">Assign to members</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateItem(item.id, { splitMemberIds: selectedMembers.map(m => m.id), splitType: 'equally' }); }}
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                          className="text-[10px] text-indigo-500 dark:text-indigo-400 font-black uppercase tracking-widest focus:outline-none focus:ring-0 !min-h-0"
                        >
                          Select All
                        </button>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
                        {selectedMembers.map(member => {
                          const isSelected = item.splitMemberIds.includes(member.id);
                          return (
                            <div
                              key={member.id}
                              role="button"
                              onClick={() => toggleMemberForItem(item.id, member.id)}
                              style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                              className="group flex flex-col items-center gap-2 cursor-pointer h-auto w-full justify-start outline-none focus:outline-none"
                            >
                              <div className={`relative w-12 h-12 rounded-2xl transition-all duration-200 overflow-hidden ${isSelected
                                ? 'bg-indigo-100 dark:bg-indigo-900/40'
                                : 'grayscale opacity-40 hover:grayscale-0 hover:opacity-100 border border-gray-100 dark:border-slate-700'
                                }`}>
                                <img src={member.avatar} className="w-full h-full object-cover" />
                              </div>
                              <span className={`text-[11px] font-bold w-full text-center leading-tight ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                {member.name.split(' ')[0]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {
        entryMode === 'itemized' && (
          <button
            onClick={addItem}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-[2rem] text-gray-400 dark:text-slate-500 font-bold hover:border-indigo-200 dark:hover:border-indigo-900 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-3 focus:outline-none focus:ring-0"
          >
            <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-xs">
              <i className="fas fa-plus"></i>
            </div>
            <span>Add item</span>
          </button>
        )
      }

      <section className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-gray-100 dark:border-slate-700 p-8 shadow-xl shadow-gray-200/20 dark:shadow-none space-y-6">
        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest border-b border-gray-50 dark:border-slate-700 pb-4">Bill Summary</h4>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-slate-400 font-bold">Subtotal</span>
            <div className="flex items-center gap-2 px-3 py-1.5">
              <span className="text-gray-400 dark:text-slate-500 text-xs font-bold">$</span>
              <span className="w-16 text-right text-sm font-black text-gray-900 dark:text-white">{subtotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center group/input">
            <span className="text-sm text-gray-500 dark:text-slate-400 font-bold">Tax</span>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-xl border border-transparent focus-within:border-indigo-100 dark:focus-within:border-indigo-900 transition-all">
              <span className="text-gray-400 dark:text-slate-500 text-xs font-bold">$</span>
              <input
                type="number"
                step="0.01"
                value={tax || ''}
                onChange={(e) => onChange(items, parseFloat(e.target.value) || 0, discount, otherCharges)}
                className="w-16 text-right text-sm font-black text-gray-900 dark:text-white border-none focus:ring-0 bg-transparent !min-h-0 !p-0"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-slate-400 font-bold">Extra Fees</span>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-xl border border-transparent focus-within:border-indigo-100 dark:focus-within:border-indigo-900 transition-all">
              <span className="text-gray-400 dark:text-slate-500 text-xs font-bold">$</span>
              <input
                type="number"
                step="0.01"
                value={otherCharges || ''}
                onChange={(e) => onChange(items, tax, discount, parseFloat(e.target.value) || 0)}
                className="w-16 text-right text-sm font-black text-gray-900 dark:text-white border-none focus:ring-0 bg-transparent !min-h-0 !p-0"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-emerald-500 dark:text-emerald-400 font-bold">Discount</span>
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 px-3 py-1.5 rounded-xl border border-transparent focus-within:border-emerald-100 dark:focus-within:border-emerald-900/50 transition-all">
              <span className="text-emerald-400 dark:text-emerald-500/50 text-xs font-bold">- $</span>
              <input
                type="number"
                step="0.01"
                value={discount || ''}
                onChange={(e) => onChange(items, tax, parseFloat(e.target.value) || 0, otherCharges)}
                className="w-16 text-right text-sm font-black border-none focus:ring-0 text-emerald-600 dark:text-emerald-400 bg-transparent !min-h-0 !p-0"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-tighter">Settlement Total</span>
              <span className="text-xs text-gray-400 dark:text-slate-600 font-medium">Verified Split</span>
            </div>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">${calculatedTotal.toFixed(2)}</span>
          </div>
        </div>
      </section>
    </div >
  );
};
