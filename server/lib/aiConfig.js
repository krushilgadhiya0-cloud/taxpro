import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.resolve(__dirname, '../ai_config.json');

// Memory cache
let cachedConfig = null;

export async function getAIConfig() {
  if (cachedConfig) return cachedConfig;

  // 1. Try reading from PostgreSQL
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS ai_configurations (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        api_key TEXT,
        model TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    const active = await query(`SELECT * FROM ai_configurations WHERE is_active = TRUE ORDER BY updated_at DESC LIMIT 1`);
    if (active.rowCount > 0) {
      cachedConfig = {
        provider: active.rows[0].provider,
        apiKey: active.rows[0].api_key || '',
        model: active.rows[0].model || ''
      };
      return cachedConfig;
    }
  } catch (e) {}

  // 2. Try reading from local ai_config.json file
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const fileData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (fileData && fileData.provider) {
        cachedConfig = fileData;
        return cachedConfig;
      }
    }
  } catch (e) {}

  // 3. Fallback to process.env variables
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY) {
    cachedConfig = {
      provider: 'gemini',
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY,
      model: 'gemini-2.0-flash'
    };
    return cachedConfig;
  }

  if (process.env.OPENAI_API_KEY) {
    cachedConfig = {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini'
    };
    return cachedConfig;
  }

  if (process.env.GROQ_API_KEY) {
    cachedConfig = {
      provider: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      model: 'llama-3.3-70b-versatile'
    };
    return cachedConfig;
  }

  // 4. Default: High-precision built-in cognitive synthesizer (No external key required)
  cachedConfig = {
    provider: 'cognitive',
    apiKey: '',
    model: 'taxpro-cognitive-chatgpt-v4'
  };
  return cachedConfig;
}

export async function saveAIConfig({ provider, apiKey, model }) {
  const cleanProvider = (provider || 'cognitive').toLowerCase().trim();
  const cleanKey = (apiKey || '').trim();
  let defaultModel = model;

  if (!defaultModel) {
    if (cleanProvider === 'gemini') defaultModel = 'gemini-2.0-flash';
    else if (cleanProvider === 'openai') defaultModel = 'gpt-4o-mini';
    else if (cleanProvider === 'groq') defaultModel = 'llama-3.3-70b-versatile';
    else if (cleanProvider === 'openrouter') defaultModel = 'meta-llama/llama-3.3-70b-instruct:free';
    else defaultModel = 'taxpro-cognitive-chatgpt-v4';
  }

  const newConfig = {
    provider: cleanProvider,
    apiKey: cleanKey,
    model: defaultModel
  };

  // Update memory cache
  cachedConfig = newConfig;

  // Persist to disk JSON
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf8');
  } catch (err) {
    console.error('[AI Config] Failed to save to disk:', err.message);
  }

  // Persist to PostgreSQL
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS ai_configurations (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        api_key TEXT,
        model TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await query(`UPDATE ai_configurations SET is_active = FALSE`);
    await query(`
      INSERT INTO ai_configurations (id, provider, api_key, model, is_active, updated_at)
      VALUES ($1, $2, $3, $4, TRUE, NOW())
      ON CONFLICT (id) DO UPDATE 
      SET provider = EXCLUDED.provider, api_key = EXCLUDED.api_key, model = EXCLUDED.model, is_active = TRUE, updated_at = NOW()
    `, [`config_${Date.now()}`, cleanProvider, cleanKey, defaultModel]);
  } catch (err) {
    console.error('[AI Config] Failed to save to PostgreSQL:', err.message);
  }

  return newConfig;
}

export async function testAPIKey({ provider, apiKey, model }) {
  const cleanProvider = (provider || '').toLowerCase().trim();
  const cleanKey = (apiKey || '').trim();

  if (cleanProvider === 'cognitive') {
    return {
      success: true,
      message: 'TaxPro Cognitive Synthesizer is active and ready (zero external latency).'
    };
  }

  if (!cleanKey) {
    return {
      success: false,
      message: `API Key is required to connect with ${cleanProvider.toUpperCase()}.`
    };
  }

  try {
    if (cleanProvider === 'gemini') {
      const targetModel = model || 'gemini-2.0-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${cleanKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with "OK".' }] }]
        }),
        signal: AbortSignal.timeout(7000)
      });

      if (res.ok) {
        return { success: true, message: `Successfully connected to Google Gemini (${targetModel})!` };
      }
      // Try fallback model gemini-1.5-flash
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`;
      const fbRes = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with "OK".' }] }]
        }),
        signal: AbortSignal.timeout(7000)
      });
      if (fbRes.ok) {
        return { success: true, message: 'Successfully connected to Google Gemini (gemini-1.5-flash)!' };
      }

      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData?.error?.message || `Google Gemini authentication failed (Status ${res.status}). Verify your API key.`
      };
    }

    if (cleanProvider === 'openai') {
      const targetModel = model || 'gpt-4o-mini';
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5
        }),
        signal: AbortSignal.timeout(7000)
      });

      if (res.ok) {
        return { success: true, message: `Successfully connected to OpenAI (${targetModel})!` };
      }
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData?.error?.message || `OpenAI connection failed (Status ${res.status}). Check API key and account credits.`
      };
    }

    if (cleanProvider === 'groq') {
      const targetModel = model || 'llama-3.3-70b-versatile';
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5
        }),
        signal: AbortSignal.timeout(7000)
      });

      if (res.ok) {
        return { success: true, message: `Successfully connected to Groq Cloud (${targetModel})!` };
      }
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData?.error?.message || `Groq Cloud connection failed (Status ${res.status}). Check API key.`
      };
    }

    if (cleanProvider === 'openrouter') {
      const targetModel = model || 'meta-llama/llama-3.3-70b-instruct:free';
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5
        }),
        signal: AbortSignal.timeout(7000)
      });

      if (res.ok) {
        return { success: true, message: `Successfully connected to OpenRouter (${targetModel})!` };
      }
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData?.error?.message || `OpenRouter connection failed (Status ${res.status}). Check API key.`
      };
    }

    return { success: false, message: `Unsupported AI provider: ${cleanProvider}` };
  } catch (err) {
    return { success: false, message: `Connection error: ${err.message}` };
  }
}
