import React, { useState } from 'react';
import { X, Award, CheckCircle2, Gift, Gem, Dices, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Mission } from '../types/game';
import { sound } from '../utils/audio';

interface MissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  missions: Mission[];
  onClaimReward: (missionId: string) => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  isOpen,
  onClose,
  missions,
  onClaimReward
}) => {
  const [selectedTier, setSelectedTier] = useState<'all' | 'bronze' | 'silver' | 'gold'>('all');

  if (!isOpen) return null;

  const filteredMissions = missions.filter(
    (m) => selectedTier === 'all' || m.tier === selectedTier
  );

  const handleClaim = (mission: Mission) => {
    sound.playWinFanfare();
    confetti({ particleCount: 50, spread: 60 });
    onClaimReward(mission.id);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'gold': return 'from-amber-400 to-yellow-600 border-yellow-400 text-yellow-300';
      case 'silver': return 'from-slate-300 to-slate-400 border-slate-300 text-slate-200';
      case 'bronze': return 'from-amber-700 to-amber-800 border-amber-600 text-amber-300';
      default: return 'from-slate-700 to-slate-800 border-slate-700 text-slate-300';
    }
  };

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
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-fredoka text-xl sm:text-2xl font-bold text-white">
              Daily Mission Challenges
            </h2>
            <p className="text-xs text-slate-400">
              Complete tiered objectives to unlock rolls, coins, and rare gems!
            </p>
          </div>
        </div>

        {/* Tier Filter Tabs */}
        <div className="flex items-center gap-1.5 mb-4 border-b border-slate-800 pb-2">
          {(['all', 'bronze', 'silver', 'gold'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTier(t)}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                selectedTier === t
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Mission Cards List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filteredMissions.map((mission) => {
            const isReadyToClaim = mission.current >= mission.target && !mission.claimed;
            const progressPercent = Math.min(100, Math.round((mission.current / mission.target) * 100));

            return (
              <div
                key={mission.id}
                className={`p-3 rounded-2xl border transition-all ${
                  mission.claimed
                    ? 'bg-slate-900/40 border-slate-800 opacity-60'
                    : isReadyToClaim
                    ? 'bg-gradient-to-r from-amber-500/20 via-yellow-400/10 to-amber-500/20 border-amber-400 shadow-md'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border bg-gradient-to-r ${getTierColor(
                          mission.tier
                        )}`}
                      >
                        {mission.tier}
                      </span>
                      <h4 className="font-bold text-sm text-white">{mission.title}</h4>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{mission.description}</p>
                  </div>

                  {/* Rewards Preview */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-amber-300 font-bold">🪙 +{mission.rewardCoins}</span>
                    <span className="text-cyan-300 font-bold">💎 +{mission.rewardGems}</span>
                    <span className="text-blue-300 font-bold">🎲 +{mission.rewardRolls}</span>
                  </div>
                </div>

                {/* Progress bar and Claim Button */}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>Progress</span>
                      <span>
                        {mission.current} / {mission.target}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isReadyToClaim ? 'bg-amber-400' : 'bg-blue-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {mission.claimed ? (
                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold px-2 py-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Claimed</span>
                    </div>
                  ) : isReadyToClaim ? (
                    <button
                      onClick={() => handleClaim(mission)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/30 hover:brightness-110 active:scale-95 cursor-pointer animate-pulse"
                    >
                      CLAIM
                    </button>
                  ) : (
                    <span className="text-slate-500 text-xs font-semibold px-2 py-1">
                      In Progress
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
