
import React, { useState } from 'react';
import { User, Group } from '@/types';

interface GroupSelectorProps {
  selectedGroupId: string | null;
  selectedMemberIds: string[];
  onChange: (groupId: string | null, memberIds: string[]) => void;
  groups: Group[];
  friends: User[];
}

export const GroupSelector: React.FC<GroupSelectorProps> = ({
  selectedGroupId,
  selectedMemberIds,
  onChange,
  groups,
  friends,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleGroupSelect = (group: Group) => {
    onChange(group.id, group.members.map(m => m.id));
  };

  const handleMemberToggle = (userId: string) => {
    const newMembers = selectedMemberIds.includes(userId)
      ? selectedMemberIds.filter(id => id !== userId)
      : [...selectedMemberIds, userId];

    onChange(null, newMembers);
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  const handleGroupMemberToggle = (userId: string) => {
    const newMembers = selectedMemberIds.includes(userId)
      ? selectedMemberIds.filter(id => id !== userId)
      : [...selectedMemberIds, userId];

    // Preserve the group selection when toggling group members
    onChange(selectedGroupId, newMembers);
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = friends.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const featuredGroups = groups.slice(0, 3);

  return (
    <div className="space-y-8 pb-10">
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <i className="fas fa-search text-gray-300 dark:text-slate-600 group-focus-within:text-indigo-500 transition-colors"></i>
        </div>
        <input
          type="text"
          placeholder="Search groups or friends..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-4 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-[1.5rem] shadow-sm focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 transition-all font-medium text-gray-800 dark:text-white"
        />
      </div>

      {!searchTerm && (
        <section className="animate-slide-up">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Recent Groups</h3>
            <span className="text-[10px] font-bold text-indigo-500">Swipe →</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 px-2 no-scrollbar snap-x">
            {featuredGroups.map(group => (
              <button
                key={group.id}
                onClick={() => handleGroupSelect(group)}
                className={`snap-start min-w-[160px] p-6 rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-start gap-4 focus:outline-none focus:ring-0 ${selectedGroupId === group.id
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow-lg shadow-indigo-100 dark:shadow-none'
                  : 'border-white dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md hover:border-gray-100 dark:hover:border-slate-600'
                  }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black ${selectedGroupId === group.id ? 'bg-indigo-600 text-white' : 'bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400'
                  }`}>
                  {group.name.charAt(0)}
                </div>
                <div className="text-left">
                  <div className={`font-black text-sm leading-tight ${selectedGroupId === group.id ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-900 dark:text-white'}`}>
                    {group.name}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-tighter">
                    {group.members.length} members
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-6">
        {searchTerm && filteredGroups.length > 0 && (
          <section className="animate-slide-up">
            <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 px-2">Groups</h3>
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-50 dark:border-slate-700 shadow-xl shadow-gray-200/20 dark:shadow-none overflow-hidden">
              <div className="max-h-[350px] overflow-y-auto">
                {filteredGroups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => handleGroupSelect(group)}
                    style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', WebkitTapHighlightColor: 'transparent' }}
                    className={`w-full px-6 py-4 flex items-center justify-between border-b border-gray-50 dark:border-slate-700 last:border-none hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-0 active:outline-none`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${selectedGroupId === group.id ? 'bg-indigo-600 text-white' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                          }`}>
                          {group.name.charAt(0)}
                        </div>
                        {selectedGroupId === group.id && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                            <i className="fas fa-check text-[6px] text-white"></i>
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <span className={`text-sm font-bold block ${selectedGroupId === group.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-slate-300'}`}>
                          {group.name}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
                          {group.members.length} members
                        </span>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${selectedGroupId === group.id ? 'bg-indigo-600 border-indigo-600 rotate-0' : 'border-gray-200 dark:border-slate-600 rotate-45'
                      }`}>
                      {selectedGroupId === group.id ? (
                        <i className="fas fa-check text-[10px] text-white"></i>
                      ) : (
                        <i className="fas fa-plus text-[8px] text-gray-200 dark:text-slate-600"></i>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}



        {selectedGroup && selectedGroup.members.length > 0 && (
          <section className="animate-slide-up">
            <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 px-2">Group Members</h3>
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-50 dark:border-slate-700 shadow-xl shadow-gray-200/20 dark:shadow-none overflow-hidden">
              <div className="max-h-[350px] overflow-y-auto">
                {selectedGroup.members.map(member => (
                  <button
                    key={member.id}
                    onClick={() => handleGroupMemberToggle(member.id)}
                    style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', WebkitTapHighlightColor: 'transparent' }}
                    className="w-full px-6 py-4 flex items-center justify-between border-b border-gray-50 dark:border-slate-700 last:border-none hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-0 active:outline-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=random`} className="w-10 h-10 rounded-xl object-cover grayscale-[0.5]" alt={member.name} />
                        {selectedMemberIds.includes(member.id) && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                            <i className="fas fa-check text-[6px] text-white"></i>
                          </div>
                        )}
                      </div>
                      <span className={`text-sm font-bold ${selectedMemberIds.includes(member.id) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-slate-300'}`}>
                        {member.name}
                      </span>
                    </div>
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${selectedMemberIds.includes(member.id) ? 'bg-indigo-600 border-indigo-600 rotate-0' : 'border-gray-200 dark:border-slate-600 rotate-45'
                      }`}>
                      {selectedMemberIds.includes(member.id) ? (
                        <i className="fas fa-check text-[10px] text-white"></i>
                      ) : (
                        <i className="fas fa-plus text-[8px] text-gray-200 dark:text-slate-600"></i>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="animate-slide-up">
          <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 px-2">Friends</h3>
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-50 dark:border-slate-700 shadow-xl shadow-gray-200/20 dark:shadow-none overflow-hidden">
            <div className="max-h-[350px] overflow-y-auto">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleMemberToggle(user.id)}
                  style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', WebkitTapHighlightColor: 'transparent' }}
                  className="w-full px-6 py-4 flex items-center justify-between border-b border-gray-50 dark:border-slate-700 last:border-none hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-0 active:outline-none"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img src={user.avatar} className="w-10 h-10 rounded-xl object-cover grayscale-[0.5]" alt={user.name} />
                      {selectedMemberIds.includes(user.id) && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                          <i className="fas fa-check text-[6px] text-white"></i>
                        </div>
                      )}
                    </div>
                    <span className={`text-sm font-bold ${selectedMemberIds.includes(user.id) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-slate-300'}`}>
                      {user.name}
                    </span>
                  </div>
                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${selectedMemberIds.includes(user.id) ? 'bg-indigo-600 border-indigo-600 rotate-0' : 'border-gray-200 dark:border-slate-600 rotate-45'
                    }`}>
                    {selectedMemberIds.includes(user.id) ? (
                      <i className="fas fa-check text-[10px] text-white"></i>
                    ) : (
                      <i className="fas fa-plus text-[8px] text-gray-200 dark:text-slate-600"></i>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>

  );
};
