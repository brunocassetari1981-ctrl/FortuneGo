import React from 'react';

interface TabItem {
  id: string;
  label: string;
  icon: string;
  activeIcon?: string;
  badge?: number;
}

interface BottomTabBarProps {
  active: string;
  onChange: (id: string) => void;
  onDeposit: () => void;
}

const TABS: TabItem[] = [
  { id: 'comecar', label: 'Começar', icon: '🏠' },
  { id: 'ofertas', label: 'Ofertas', icon: '🎁', badge: 4 },
  { id: 'deposit', label: 'Depósito', icon: '💳' },
  { id: 'suporte', label: 'Suporte', icon: '💬' },
  { id: 'perfil', label: 'Perfil', icon: '👤' },
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ active, onChange, onDeposit }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* Safe area spacer for iOS */}
      <div className="lobby-container bg-[#0f261e] border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.6)]">
        <div className="grid grid-cols-5 items-end px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] relative">
          {TABS.map(tab => {
            const isActive = active === tab.id;
            const isCenter = tab.id === 'deposit';

            if (isCenter) {
              return (
                <button
                  key={tab.id}
                  onClick={onDeposit}
                  className="flex flex-col items-center justify-end -mt-4 cursor-pointer active:scale-95"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 flex items-center justify-center text-xl shadow-lg shadow-amber-500/30 border-2 border-yellow-200 -mb-1">
                    💰
                  </div>
                  <span className="text-[10px] font-black text-amber-300 tracking-wide">Depósito</span>
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-colors cursor-pointer active:scale-95 relative ${isActive ? 'text-amber-300' : 'text-white/60 hover:text-white/90'}`}
              >
                <span className={`text-[18px] leading-none ${isActive ? 'drop-shadow' : ''}`}>{tab.icon}</span>
                <span className={`text-[10px] font-bold leading-none tracking-wide ${isActive ? 'text-amber-300' : 'text-white/60'}`}>{tab.label}</span>
                {tab.badge && <span className="absolute -top-0.5 right-4 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border border-white/20">{tab.badge}</span>}
                {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-amber-400" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
