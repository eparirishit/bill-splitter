
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
        <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-[2.5rem] flex gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 shrink-0">
            <i className="fas fa-wand-magic-sparkles text-xs"></i>
          </div>
          <p className="text-xs text-amber-900 dark:text-amber-400 leading-relaxed font-medium">
            Verify extracted items carefully. AI may misread handwritten or blurry receipts.
          </p>
        </div>
      )}

      {flow === AppFlow.MANUAL && (
        <div className="flex p-1.5 bg-muted rounded-[2.5rem]">
          <button
            onClick={() => handleModeChange('quick')}
            style={{ WebkitTapHighlightColor: 'transparent', outline: 'none', boxShadow: 'none' }}
            className={`flex-1 py-2 text-[10px] font-bold rounded-2xl transition-all focus:outline-none focus:ring-0 outline-none ring-0 !min-h-0 h-auto ${entryMode === 'quick' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
              }`}
          >
            Quick Total
          </button>
          <button
            onClick={() => handleModeChange('itemized')}
            style={{ WebkitTapHighlightColor: 'transparent', outline: 'none', boxShadow: 'none' }}
            className={`flex-1 py-2 text-[10px] font-bold rounded-2xl transition-all focus:outline-none focus:ring-0 outline-none ring-0 !min-h-0 h-auto ${entryMode === 'itemized' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
              }`}
          >
            Itemized
          </button>
        </div>
      )}

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className={`group bg-card text-card-foreground rounded-[2.5rem] border transition-all duration-300 ${expandedId === item.id
            ? 'border-transparent'
            : 'border-border hover:border-primary/20 shadow-sm'
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
                      className="font-bold text-foreground bg-transparent border-none focus:ring-0 w-full text-base !min-h-0 !p-0 resize-none break-words"
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
                      className="font-bold text-foreground bg-transparent border-none focus:ring-0 w-full truncate text-base !min-h-0 !p-0"
                      title={item.name}
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${item.splitType === 'quantity'
                    ? 'bg-violet-500/10 text-violet-500'
                    : item.splitMemberIds.length === selectedMembers.length
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-primary/10 text-primary'
                    }`}>
                    {item.splitType === 'quantity' ? 'Split by Qty' : item.splitMemberIds.length === selectedMembers.length ? 'Split All' : `${item.splitMemberIds.length} members`}
                  </span>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
                    Qty: {item.quantity || 1}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-muted/50 px-2 py-2 rounded-xl border border-border group-hover:bg-muted transition-colors">
                  <span className="text-muted-foreground text-xs font-bold mr-1">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={item.price || ''}
                    onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                    onClick={(e) => e.stopPropagation()}
                    className="w-14 font-black text-foreground border-none focus:ring-0 text-right bg-transparent !min-h-0 !p-0"
                  />
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${expandedId === item.id ? 'bg-primary/10 text-primary rotate-180' : 'text-muted-foreground/50'
                  }`}>
                  <i className="fas fa-chevron-down text-[10px]"></i>
                </div>
              </div>
            </div>

            {expandedId === item.id && (
              <div className="px-5 pb-5 border-t border-border pt-5 animate-slide-up">
                <div className="flex flex-col gap-6">
                  {/* Top Bar: Settings */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 bg-muted p-1.5 rounded-2xl">
                      <button
                        onClick={() => updateItem(item.id, { splitType: 'equally', splitMemberIds: selectedMembers.map(m => m.id) })}
                        style={{ WebkitTapHighlightColor: 'transparent', outline: 'none', boxShadow: 'none' }}
                        className={`text-[10px] px-3 py-2 rounded-xl font-bold transition-all focus:outline-none focus:ring-0 outline-none ring-0 !min-h-0 ${item.splitType === 'equally' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
                      >
                        Equal
                      </button>
                      <button
                        onClick={() => updateItem(item.id, { splitType: 'quantity', quantityAssignments: item.quantityAssignments || {} })}
                        style={{ WebkitTapHighlightColor: 'transparent', outline: 'none', boxShadow: 'none' }}
                        className={`text-[10px] px-3 py-2 rounded-xl font-bold transition-all focus:outline-none focus:ring-0 outline-none ring-0 !min-h-0 ${item.splitType === 'quantity' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
                      >
                        By Qty
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-xl">
                        <span className="text-[9px] font-black text-muted-foreground uppercase">Qty</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                          style={{ outline: 'none', boxShadow: 'none' }}
                          className="w-8 text-center text-xs font-black bg-transparent border-none focus:ring-0 text-foreground !min-h-0 !p-0"
                        />
                      </div>
                      {entryMode === 'itemized' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                          className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors focus:outline-none focus:ring-0 !min-h-0 !p-0"
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
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assign Units</span>
                        <span className="text-[9px] font-bold text-primary">Total: {(Object.values(item.quantityAssignments || {}) as number[]).reduce((a, b) => a + b, 0).toFixed(2)} / {item.quantity}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Use decimals to share a unit (e.g. 0.5 each for two people).</p>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedMembers.map(member => {
                          const assigned = item.quantityAssignments?.[member.id] ?? 0;
                          return (
                            <div key={member.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl border border-border/50">
                              <div className="flex items-center gap-3 min-w-0">
                                <img src={member.avatar} className="w-8 h-8 rounded-lg shrink-0" alt="" />
                                <span className="text-xs font-bold text-foreground truncate">{member.name}</span>
                              </div>
                              <div className="flex items-center gap-2 bg-muted/50 px-2 py-2 rounded-xl border border-border shrink-0">
                                <button
                                  type="button"
                                  onClick={() => updateQuantityAssignment(item.id, member.id, Math.max(0, assigned - 1))}
                                  style={{ WebkitTapHighlightColor: 'transparent', outline: 'none', boxShadow: 'none' }}
                                  className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-0 !min-h-0 !p-0 rounded-lg hover:bg-muted"
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
                                  className="w-8 text-xs font-black text-center text-foreground bg-transparent border-none focus:ring-0 !min-h-0 !p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  aria-label={`Units for ${member.name}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => updateQuantityAssignment(item.id, member.id, assigned + 1)}
                                  style={{ WebkitTapHighlightColor: 'transparent', outline: 'none', boxShadow: 'none' }}
                                  className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-0 !min-h-0 !p-0 rounded-lg hover:bg-muted"
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
                        <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Assign to members</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateItem(item.id, { splitMemberIds: selectedMembers.map(m => m.id), splitType: 'equally' }); }}
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                          className="text-[10px] text-primary font-black uppercase tracking-widest focus:outline-none focus:ring-0 !min-h-0"
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
                                ? 'bg-primary/20'
                                : 'grayscale opacity-40 hover:grayscale-0 hover:opacity-100 border border-border'
                                }`}>
                                <img src={member.avatar} className="w-full h-full object-cover" />
                              </div>
                              <span className={`text-[11px] font-bold w-full text-center leading-tight ${isSelected ? 'text-primary' : 'text-muted-foreground'
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
            className="w-full py-4 border-2 border-dashed border-border rounded-[2.5rem] text-muted-foreground font-bold hover:border-primary/20 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-3 focus:outline-none focus:ring-0"
          >
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">
              <i className="fas fa-plus"></i>
            </div>
            <span>Add item</span>
          </button>
        )
      }

      <section className="bg-card text-card-foreground rounded-[2.5rem] border border-border p-8 shadow-xl shadow-primary/5 space-y-6">
        <h4 className="text-sm font-black text-foreground uppercase tracking-widest border-b border-border pb-4">Bill Summary</h4>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground font-bold">Subtotal</span>
            <div className="flex items-center gap-2 px-3 py-1.5">
              <span className="text-muted-foreground text-xs font-bold">$</span>
              <span className="w-16 text-right text-sm font-black text-foreground">{subtotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center group/input">
            <span className="text-sm text-muted-foreground font-bold">Tax</span>
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-2xl border border-transparent focus-within:border-primary/20 transition-all">
              <span className="text-muted-foreground text-xs font-bold">$</span>
              <input
                type="number"
                step="0.01"
                value={tax || ''}
                onChange={(e) => onChange(items, parseFloat(e.target.value) || 0, discount, otherCharges)}
                className="w-16 text-right text-sm font-black text-foreground border-none focus:ring-0 bg-transparent !min-h-0 !p-0"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground font-bold">Extra Fees</span>
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-2xl border border-transparent focus-within:border-primary/20 transition-all">
              <span className="text-muted-foreground text-xs font-bold">$</span>
              <input
                type="number"
                step="0.01"
                value={otherCharges || ''}
                onChange={(e) => onChange(items, tax, discount, parseFloat(e.target.value) || 0)}
                className="w-16 text-right text-sm font-black text-foreground border-none focus:ring-0 bg-transparent !min-h-0 !p-0"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-emerald-500 font-bold">Discount</span>
            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-2xl border border-transparent focus-within:border-emerald-500/30 transition-all">
              <span className="text-emerald-500/50 text-xs font-bold">- $</span>
              <input
                type="number"
                step="0.01"
                value={discount || ''}
                onChange={(e) => onChange(items, tax, parseFloat(e.target.value) || 0, otherCharges)}
                className="w-16 text-right text-sm font-black border-none focus:ring-0 text-emerald-600 bg-transparent !min-h-0 !p-0"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-border flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Settlement Total</span>
              <span className="text-xs text-muted-foreground/60 font-medium">Verified Split</span>
            </div>
            <span className="text-2xl font-black text-primary tracking-tight">${calculatedTotal.toFixed(2)}</span>
          </div>
        </div>
      </section>
    </div >
  );
};
