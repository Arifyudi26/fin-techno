// Helper untuk komunikasi dengan Telegram Bot API menggunakan native fetch

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// Tipe untuk inline keyboard button
export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

// Kirim pesan ke user berdasarkan chatId
// Opsional: sertakan reply_markup berisi inline keyboard buttons
export async function sendMessage(
  chatId: number | string,
  text: string,
  buttons?: InlineKeyboardButton[][]
) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "MarkdownV2",
  };

  if (buttons && buttons.length > 0) {
    body.reply_markup = { inline_keyboard: buttons };
  }

  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Telegram sendMessage error:", err);
  }
  return res;
}

// Jawab callback query dari inline button (wajib dipanggil agar loading spinner hilang)
export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

// Hapus inline keyboard dari pesan sebelumnya (supaya tombol tidak bisa diklik ulang)
export async function removeKeyboard(chatId: number | string, messageId: number) {
  await fetch(`${TELEGRAM_API}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    }),
  });
}

// Daftarkan URL webhook ke Telegram, dipanggil sekali setelah deploy
// secret_token wajib disertakan agar Telegram mengirim header
// x-telegram-bot-api-secret-token yang dicek di endpoint webhook
export async function setWebhook(webhookUrl: string) {
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  const body: Record<string, string> = { url: webhookUrl };
  if (secretToken) body.secret_token = secretToken;

  const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Hapus webhook, dipakai saat beralih ke mode polling di development
export async function deleteWebhook() {
  const res = await fetch(`${TELEGRAM_API}/deleteWebhook`, { method: "POST" });
  return res.json();
}

// Struktur update yang dikirim Telegram ke webhook endpoint
export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
  // Dikirim saat user klik inline keyboard button
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    message: {
      message_id: number;
      chat: { id: number };
    };
    data: string; // isi callback_data dari button yang diklik
  };
}
