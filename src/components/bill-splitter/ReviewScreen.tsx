
import React from 'react';
import { BillData, User, Group } from '@/types';

interface ReviewScreenProps {
  billData: BillData;
  onUpdate: (updates: Partial<BillData>) => void;
  members: User[];
  groups: Group[];
  authUserId?: string;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ billData, onUpdate, members, groups, authUserId }) => {
  const selectedMembers = members.filter(u => billData.selectedMemberIds.includes(u.id));

  // Determine who can be a payer based on the context (Group or Individual split)
  const payerList = billData.groupId
    ? (groups.find(g => g.id === billData.groupId)?.members || [])
    : members.filter(u => billData.selectedMemberIds.includes(u.id) || u.id === authUserId);

  const splits: Record<string, number> = {};
  selectedMembers.forEach(m => (splits[m.id] = 0));

  billData.items.forEach(item => {
    if (item.splitType === 'quantity' && item.quantityAssignments) {
      {/* Added type assertion for Object.values on Record<string, number> */ }
      const totalUnits = (Object.values(item.quantityAssignments) as number[]).reduce((a, b) => a + b, 0);
      if (totalUnits > 0) {
        const unitPrice = item.price / totalUnits;
        {/* Added type assertion for Object.entries on Record<string, number> */ }
        (Object.entries(item.quantityAssignments) as [string, number][]).forEach(([mId, units]) => {
          if (splits[mId] !== undefined) splits[mId] += unitPrice * units;
        });
      } else {
        // Fallback if no units assigned but splitType is quantity
        const share = item.price / item.splitMemberIds.length;
        item.splitMemberIds.forEach(mId => {
          if (splits[mId] !== undefined) splits[mId] += share;
        });
      }
    } else {
      if (item.splitMemberIds.length > 0) {
        const share = item.price / item.splitMemberIds.length;
        item.splitMemberIds.forEach(mId => {
          if (splits[mId] !== undefined) splits[mId] += share;
        });
      }
    }
  });

  const subtotal = billData.items.reduce((s, i) => s + i.price, 0);
  const overhead = (billData.tax + billData.otherCharges - billData.discount);

  if (subtotal > 0) {
    Object.keys(splits).forEach(mId => {
      const proportion = splits[mId] / subtotal;
      splits[mId] += overhead * proportion;
    });
  } else if (selectedMembers.length > 0) {
    Object.keys(splits).forEach(mId => {
      splits[mId] += overhead / selectedMembers.length;
    });
  }

  const generateSummary = () => {
    let summary = `Detailed Split for ${billData.storeName || 'Bill'}:\n\n`;

    if (billData.items.length > 0) {
      billData.items.forEach((item, idx) => {
        if (item.splitType === 'quantity' && item.quantityAssignments) {
          {/* Added type assertion for Object.values on Record<string, number> */ }
          const totalUnits = (Object.values(item.quantityAssignments) as number[]).reduce((a, b) => a + b, 0);
          const unitPrice = item.price / (totalUnits || 1);
          summary += `${idx + 1}. ${item.name} (Qty Split): $${item.price.toFixed(2)}\n`;
          {/* Added type assertion for Object.entries on Record<string, number> */ }
          (Object.entries(item.quantityAssignments) as [string, number][]).forEach(([mId, units]) => {
            const name = members.find(u => u.id === mId)?.name || 'Unknown';
            summary += `   - ${name}: ${units} unit(s) @ $${(unitPrice * units).toFixed(2)}\n`;
          });
        } else {
          const perPerson = item.price / (item.splitMemberIds.length || 1);
          const names = item.splitMemberIds.map(id => members.find(u => u.id === id)?.name).join(', ');
          summary += `${idx + 1}. ${item.name}: $${item.price.toFixed(2)} ($${perPerson.toFixed(2)} each for ${names})\n`;
        }
      });
    }

    summary += `\nSummary:`;
    summary += `\n- Subtotal: $${subtotal.toFixed(2)}`;
    if (billData.tax) summary += `\n- Tax: $${billData.tax.toFixed(2)}`;
    if (billData.otherCharges) summary += `\n- Fees: $${billData.otherCharges.toFixed(2)}`;
    if (billData.discount) summary += `\n- Discount: -$${billData.discount.toFixed(2)}`;

    summary += `\n\nFinal Settlement Totals:\n`;
    selectedMembers.forEach(m => {
      summary += `- ${m.name === 'Me' ? 'Your total' : m.name}: $${splits[m.id].toFixed(2)}\n`;
    });

    onUpdate({ notes: summary });
  };

  return (
    <div className="space-y-8 animate-slide-up pb-24">
      <section className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/20 dark:shadow-none border border-gray-100 dark:border-slate-800 space-y-6">
        <h3 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest border-b border-gray-50 dark:border-slate-800 pb-4">General Info</h3>

        <div className="space-y-6">
          <div className="group">
            <label className="block text-[10px] font-black text-indigo-400 dark:text-indigo-300 uppercase mb-2 tracking-tighter">Business Name</label>
            <input
              type="text"
              value={billData.storeName}
              onChange={(e) => onUpdate({ storeName: e.target.value })}
              className="w-full text-2xl font-black text-gray-900 dark:text-white border-none focus:ring-0 placeholder:text-gray-200 dark:placeholder:text-slate-700 bg-transparent focus:bg-transparent shadow-none !min-h-0 !p-0"
              placeholder="Starbucks Coffee..."
            />
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-50 dark:border-slate-800">
            <div className="relative">
              <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase mb-2">Billing Date</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500 dark:text-indigo-400">
                  <i className="fas fa-calendar-alt"></i>
                </div>
                <input
                  type="date"
                  value={billData.date}
                  onChange={(e) => onUpdate({ date: e.target.value })}
                  className="w-full text-sm font-bold text-gray-800 dark:text-indigo-200 border-none bg-slate-50 dark:bg-slate-700/50 rounded-xl py-3 pl-10 pr-3 focus:outline-none focus:ring-0 cursor-pointer !min-h-0 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-inner-spin-button]:hidden"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase mb-2">Primary Payer</label>
              <div className="relative">
                <select
                  value={billData.payerId}
                  onChange={(e) => onUpdate({ payerId: e.target.value })}
                  className="w-full text-sm font-bold text-gray-800 dark:text-indigo-200 border-none bg-slate-50 dark:bg-slate-700/50 rounded-xl py-3 px-3 focus:outline-none focus:ring-0 appearance-none cursor-pointer !min-h-0"
                >
                  {payerList.map(m => (
                    <option key={m.id} value={m.id}>{m.name === 'Me' ? 'Paid by me' : m.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                  <i className="fas fa-chevron-down text-[10px]"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-50 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">Description</label>
              <button
                onClick={generateSummary}
                className="text-xs font-bold text-indigo-500 dark:text-indigo-400 underline hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
              >
                Auto-Fill Details
              </button>
            </div>
            <textarea
              value={billData.notes}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              className="w-full text-sm font-bold text-gray-700 dark:text-indigo-100/70 border-none bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 focus:outline-none focus:ring-0 min-h-[120px] resize-none"
              placeholder="Split details will appear here..."
            />
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-xl shadow-indigo-100/20 dark:shadow-none border border-gray-50 dark:border-slate-800 space-y-6">
        <h3 className="text-[10px] font-black text-indigo-400 dark:text-indigo-300 uppercase tracking-widest border-b border-gray-50 dark:border-slate-800 pb-4">Personal Totals</h3>

        <div className="space-y-4">
          {selectedMembers.map(member => (
            <div key={member.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-700 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-white dark:border-slate-600 shadow-sm bg-indigo-50 dark:bg-indigo-900/30">
                  <img src={member.avatar} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{member.name}</span>
                  <span className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 uppercase">Settlement ready</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400 tracking-tight">${splits[member.id].toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-8 flex flex-col items-center border-t border-gray-50 dark:border-slate-800">
          <span className="text-[10px] font-black text-gray-300 dark:text-slate-600 uppercase tracking-[0.2em] mb-1">Total Bill Amount</span>
          <span className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">${(subtotal + overhead).toFixed(2)}</span>
        </div>
      </section>
    </div>
  );
};
