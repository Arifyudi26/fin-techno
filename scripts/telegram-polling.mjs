// Script polling untuk development lokal.
// Telegram tidak bisa kirim update ke localhost, jadi script ini
// polling ke Telegram API setiap detik dan forward ke webhook handler lokal.
//
// Jalankan dengan: npm run telegram
// Pastikan .env sudah ada TELEGRAM_BOT_TOKEN sebelum menjalankan.

import https from 'https';
import http from 'http';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Baca .env manual (tanpa dotenv dependency)
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envPath = resolve(__dirname, '../.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // .env tidak ditemukan, lanjut pakai env dari sistem
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN tidak ditemukan di .env');
  process.exit(1);
}

const WEBHOOK_URL = 'http://localhost:3000/api/telegram/webhook';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

let offset = 0;
let isPolling = false;

console.log('🤖 Starting Telegram Bot Polling (local dev)...');
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
    // allowed_updates mencakup message DAN callback_query (untuk inline button)
    const body = JSON.stringify({
      offset,
      timeout: 10,
      allowed_updates: ['message', 'callback_query'],
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/getUpdates`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
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
    });
    req.on('error', reject);
    req.write(body);
    req.end();
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

      // Handle pesan teks biasa
      if (update.message?.text) {
        const from = update.message.from.first_name || 'User';
        console.log(`� [${new Date().toLocaleTimeString()}] ${from}: ${update.message.text}`);
        try {
          await forwardUpdate(update);
          console.log(`   ✅ Forwarded\n`);
        } catch (err) {
          console.error(`   ❌ Failed to forward:`, err.message, '\n');
        }
      }

      // Handle inline button click (callback_query)
      else if (update.callback_query) {
        const from = update.callback_query.from.first_name || 'User';
        console.log(`🔘 [${new Date().toLocaleTimeString()}] ${from} clicked: [${update.callback_query.data}]`);
        try {
          await forwardUpdate(update);
          console.log(`   ✅ Forwarded\n`);
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
