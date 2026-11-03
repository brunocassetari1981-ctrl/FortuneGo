// NOTA: token em frontend fica exposto no APK/dist. Use apenas para notificação admin manual.
// Para produção real, mova para backend proxy. Token fornecido pelo usuário.
export const TELEGRAM_BOT_TOKEN = "9082411689:AAED2YXKhnRjgmYWEkJEKCr5zZVngC07nN8";

// Preencha com os chat_id dos admins (número do getUpdates). Ex: [123456789, -100123...]
// Por enquanto vazio = não envia, mas já deixa código pronto. Pegue IDs em https://api.telegram.org/bot9082411689:AAED2YXKhnRjgmYWEkJEKCr5zZVngC07nN8/getUpdates após mandar "Oi" pro bot
export const TELEGRAM_ADMINS: (number | string)[] = [
  // 123456789, // seu ID - descomente e troque
  // -1001234567890, // grupo FortuneGo Pagamentos
];

function genCode(prefix: string, userId: string, amount: number) {
  const rand = Math.random().toString(36).slice(2,6).toUpperCase();
  return `${prefix}-${userId.slice(-4)}-${amount}-${rand}`;
}
export const genDepositCode = (userId: string, amount: number) => genCode("FG", userId, amount);
export const genWithdrawCode = (userId: string, amount: number) => genCode("WS", userId, amount);

export async function notifyTelegram(text: string) {
  if (!TELEGRAM_ADMINS.length) {
    console.warn("[Telegram] TELEGRAM_ADMINS vazio - configure chat_id em src/utils/telegram.ts");
    return;
  }
  const token = TELEGRAM_BOT_TOKEN;
  const promises = TELEGRAM_ADMINS.map(chat_id =>
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id, text, parse_mode: "HTML" }),
    }).then(r => r.json()).catch(e => ({ ok:false, error:String(e)}))
  );
  try { await Promise.all(promises); } catch {}
}

// Helpers prontos
export function notifyDeposito(user: { conta:string; userId:string; phone:string }, canal:string, valor:number, code:string) {
  const text = `💰 <b>Depósito R$${valor}</b>\n`+
    `Conta: ${user.conta} | ID: ${user.userId}\n`+
    `Tel: +55 ${user.phone} | Canal: ${canal}\n`+
    `Código: <code>${code}</code>\n`+
    `Instrução: usuário colou chave Pix e código na descrição. Confirme o Pix e digite ${code} no painel para creditar.`;
  return notifyTelegram(text);
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
