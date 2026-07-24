// Script polling untuk development lokal.
// Telegram tidak bisa kirim update ke localhost, jadi script ini
// polling ke Telegram API setiap detik dan forward ke webhook handler lokal.
// Jalankan dengan: yarn telegram (atau node scripts/telegram-polling.mjs)

import https from 'https';
import http from 'http';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8449428179:AAFsUTCWIfX4B62v-iMJyXh7SFlhWKvFkD4';
const WEBHOOK_URL = 'http://localhost:3000/api/telegram/webhook';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

let offset = 0;
let isPolling = false;

console.log('🤖 Starting Telegram Bot Polling...');
console.log(`📡 Forwarding updates to: ${WEBHOOK_URL}`);
console.log(`⏰ Polling interval: 1 second\n`);

// Hapus webhook dulu agar Telegram tidak kirim update ke webhook production
// dan polling bisa menerima update
deleteWebhook().then(() => {
  console.log('✅ Webhook cleared. Starting polling...\n');
  startPolling();
}).catch((err) => {
  console.error('❌ Failed to clear webhook:', err.message);
  process.exit(1);
});

function deleteWebhook() {
  return new Promise((resolve, reject) => {
    https.get(`${TELEGRAM_API}/deleteWebhook`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.ok) resolve();
          else reject(new Error(json.description));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function getUpdates() {
  return new Promise((resolve, reject) => {
    const url = `${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=30`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.result || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function forwardUpdate(update) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(update);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/telegram/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function poll() {
  if (isPolling) return;
  isPolling = true;

  try {
    const updates = await getUpdates();

    for (const update of updates) {
      offset = update.update_id + 1;

      const msg = update.message;
      if (msg?.text) {
        const from = msg.from.first_name || 'User';
        console.log(`📨 [${new Date().toLocaleTimeString()}] ${from}: ${msg.text}`);

        try {
          await forwardUpdate(update);
          console.log(`   ✅ Forwarded to webhook\n`);
        } catch (err) {
          console.error(`   ❌ Failed to forward:`, err.message, '\n');
        }
      }
    }
  } catch (err) {
    console.error('❌ Polling error:', err.message);
  } finally {
    isPolling = false;
  }
}

function startPolling() {
  setInterval(poll, 1000);
}

process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping polling...');
  process.exit(0);
});
