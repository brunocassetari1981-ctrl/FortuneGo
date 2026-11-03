// NOTA: token em frontend fica exposto no APK/dist. Use apenas para notificação admin manual.
// Para produção real, mova para backend proxy. Token fornecido pelo usuário.
export const TELEGRAM_BOT_TOKEN = "9082411689:AAED2YXKhnRjgmYWEkJEKCr5zZVngC07nN8";

// Preencha com os chat_id dos admins (número do getUpdates). Ex: [123456789, -100123...]
export const TELEGRAM_ADMINS: (number | string)[] = [
  1767750065, // BRUNO - getUpdates 2026-11-03
];

function genCode(prefix: string, userId: string, amount: number) {
  const rand = Math.random().toString(36).slice(2,6).toUpperCase();
  return `${prefix}-${userId.slice(-4)}-${amount}-${rand}`;
}
export const genDepositCode = (userId: string, amount: number) => genCode("FG", userId, amount);
export const genWithdrawCode = (userId: string, amount: number) => genCode("WS", userId, amount);

export async function notifyTelegram(text: string, replyMarkup?: any) {
  if (!TELEGRAM_ADMINS.length) {
    console.warn("[Telegram] TELEGRAM_ADMINS vazio - configure chat_id em src/utils/telegram.ts");
    return;
  }
  const token = TELEGRAM_BOT_TOKEN;
  const promises = TELEGRAM_ADMINS.map(chat_id =>
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id,
        text,
        parse_mode: "HTML",
        ...(replyMarkup ? { reply_markup: replyMarkup } : {})
      }),
    }).then(r => r.json()).catch(e => ({ ok:false, error:String(e)}))
  );
  try { await Promise.all(promises); } catch {}
}

// Helpers prontos com botão inline para creditar direto no Telegram
export function notifyDeposito(user: { conta:string; userId:string; phone:string }, canal:string, valor:number, code:string) {
  const text = `💰 <b>Depósito R$${valor}</b>\n`+
    `Conta: ${user.conta} | ID: ${user.userId}\n`+
    `Tel: +55 ${user.phone} | Canal: ${canal}\n`+
    `Código: <code>${code}</code>\n`+
    `Instrução: Clique no botão abaixo para creditar R$${valor} para este usuário instantaneamente!`;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fortunego.app';
  const creditUrl = `${origin}/?admin_credit=1&userId=${user.userId}&amount=${valor}&code=${code}`;

  const reply_markup = {
    inline_keyboard: [
      [
        {
          text: `✅ Creditar R$${valor} (ID: ${user.userId})`,
          url: creditUrl
        }
      ]
    ]
  };

  return notifyTelegram(text, reply_markup);
}

export function notifySaque(user: { conta:string; userId:string; phone:string; pixKey?:string; pixType?:string }, valor:number, code:string) {
  const text = `💸 <b>Saque R$${valor}</b>\n`+
    `Conta: ${user.conta} | ID: ${user.userId}\n`+
    `Tel: +55 ${user.phone}\n`+
    `Pix destino: ${user.pixKey || "?"} (${user.pixType||"?"})\n`+
    `Código: <code>${code}</code>\n`+
    `Ação: faça Pix manual para a chave acima e marque ${code} como pago.`;
  return notifyTelegram(text);
}
