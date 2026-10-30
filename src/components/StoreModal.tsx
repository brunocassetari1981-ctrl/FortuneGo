import React from 'react';
import { X, ShoppingBag, Gem, Dices, Check, Sparkles } from 'lucide-react';
import { Pawn } from '../types/game';
import { sound } from '../utils/audio';

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  coins: number;
  gems: number;
  currentPawnId: string;
  pawns: Pawn[];
  onSelectPawn: (id: string) => void;
  onBuyPawn: (pawn: Pawn) => void;
  onBuyRolls: (bundle: { rolls: number; costCoins: number; costGems: number }) => void;
}

export const StoreModal: React.FC<StoreModalProps> = ({
  isOpen,
  onClose,
  coins,
  gems,
  currentPawnId,
  pawns,
  onSelectPawn,
  onBuyPawn,
  onBuyRolls
}) => {
  if (!isOpen) return null;

  const rollBundles = [
    { rolls: 10, costCoins: 1000, costGems: 0, label: 'Handful of Dice' },
    { rolls: 30, costCoins: 2500, costGems: 5, label: 'Bag of Lucky Dice' },
    { rolls: 80, costCoins: 6000, costGems: 12, label: 'Fortune Chest of Dice' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto animate-in fade-in">
      <div className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 border-2 border-amber-500/40 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-fredoka text-xl sm:text-2xl font-bold text-white">
              Fortune Bazaar
            </h2>
            <p className="text-xs text-slate-400">
              Unlock mystical player pawns and recharge your dice rolls!
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Section 1: Pawns */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mascot Pawns</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {pawns.map((pawn) => {
                const isEquipped = currentPawnId === pawn.id;
                const canAfford = coins >= pawn.priceCoins && gems >= pawn.priceGems;

                return (
                  <div
                    key={pawn.id}
                    className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
                      isEquipped
                        ? 'bg-amber-500/20 border-amber-400 shadow-md ring-1 ring-amber-400'
                        : pawn.unlocked
                        ? 'bg-slate-900/80 border-slate-700 hover:border-slate-600'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{pawn.emoji}</span>
                        <div>
                          <h4 className="font-bold text-xs text-white">{pawn.name}</h4>
                          <span className="text-[9px] text-slate-400">{pawn.description}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      {pawn.unlocked ? (
                        isEquipped ? (
                          <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Equipped
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              sound.playCoin();
                              onSelectPawn(pawn.id);
                            }}
                            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
                          >
                            Equip
                          </button>
                        )
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2 text-xs font-bold">
                            {pawn.priceCoins > 0 && <span className="text-amber-300">🪙 {pawn.priceCoins}</span>}
                            {pawn.priceGems > 0 && <span className="text-cyan-300">💎 {pawn.priceGems}</span>}
                          </div>
                          <button
                            disabled={!canAfford}
                            onClick={() => {
                              sound.playCoin();
                              onBuyPawn(pawn);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                              canAfford
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 active:scale-95'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            Unlock
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Dice Energy Bundles */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1.5">
              <Dices className="w-3.5 h-3.5" />
              <span>Dice Roll Bundles</span>
            </h3>

            <div className="space-y-2">
              {rollBundles.map((bundle, idx) => {
                const canAfford = coins >= bundle.costCoins && gems >= bundle.costGems;

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold">
                        +{bundle.rolls}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-white">{bundle.label}</h4>
                        <p className="text-[10px] text-slate-400">Instantly refills your roll meter</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex flex-col text-right text-xs font-bold">
                        {bundle.costCoins > 0 && <span className="text-amber-300">🪙 {bundle.costCoins}</span>}
                        {bundle.costGems > 0 && <span className="text-cyan-300">💎 {bundle.costGems}</span>}
                      </div>
                      <button
                        disabled={!canAfford}
                        onClick={() => {
                          sound.playCoin();
                          onBuyRolls(bundle);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                          canAfford
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:brightness-110 active:scale-95'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        Buy
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
