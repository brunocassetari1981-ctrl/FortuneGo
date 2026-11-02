// src/services/gemini.ts — Gemini pronta na Arena (modo standby)
type GeminiTask = 'balance' | 'missions' | 'promo' | 'support' | 'review';
const GEMINI_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? (process as any).env?.GEMINI_API_KEY : '');
function isReady(){ return !!GEMINI_KEY && GEMINI_KEY.length > 10; }
export const geminiStatus = () => ({ ready: isReady(), keyPresent: !!GEMINI_KEY, branches: ['arena/6c53608a-fortunego'], capabilities: ['MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API'], mode: 'standby — aguardando sua próxima ordem', });
export async function runGemini(task: GeminiTask, prompt: string){ if(!isReady()) return { ok:false, error:'GEMINI_API_KEY não configurada em .env' }; return { ok:true, task, promptPreview: prompt.slice(0,200), note:'Gemini pronta. Na próxima tarefa executo a lógica completa.' }; }
export const gemini = { balance:(p:string)=>runGemini('balance',p), missions:(p:string)=>runGemini('missions',p), promo:(p:string)=>runGemini('promo',p), support:(p:string)=>runGemini('support',p), review:(p:string)=>runGemini('review',p), };
