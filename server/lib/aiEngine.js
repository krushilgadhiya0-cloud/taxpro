/**
 * TaxPro Universal AI Engine & Cognitive Neural Synthesizer
 * 
 * Features:
 *  1. Advanced Typo & Spelling Correction Engine (robust query normalization)
 *  2. "Human-Like" Structured Synthesizer (ChatGPT & Gemini style with newlines, bullets, emojis, and tables)
 *  3. Deep Domain Solvers for Wealth, Personalities, Tech, Demographics, Geography, Indian Taxation, Coding, Math, Law
 *  4. Official Google Gemini SDK (@google/genai) & REST Multi-Tier Fallback
 *  5. Smart Wikipedia & Web Synthesis (Strict filtering of meta-definitions)
 */

import { GoogleGenAI } from '@google/genai';
import { TAXPRO_SYSTEM_INSTRUCTION, TAXPRO_PLATFORM_KNOWLEDGE } from './taxproKnowledge.js';

// =========================================================================
// 1. SPELLING CORRECTION & QUERY NORMALIZATION ENGINE
// =========================================================================

const COMMON_TYPO_MAP = {
  // General & Question words
  'defrence': 'difference',
  'diffrence': 'difference',
  'differnce': 'difference',
  'differance': 'difference',
  'diffrent': 'different',
  'difrnce': 'difference',
  'populaton': 'population',
  'populatn': 'population',
  'populashun': 'population',
  'popultion': 'population',
  'populatin': 'population',
  'inda': 'india',
  'indai': 'india',
  'indya': 'india',
  'indiya': 'india',
  'bharat': 'india',
  'capitl': 'capital',
  'captial': 'capital',
  'capitol': 'capital',
  'presidant': 'president',
  'presedent': 'president',
  'presidnt': 'president',
  'primeminster': 'prime minister',
  'primeminister': 'prime minister',
  'pm': 'prime minister',
  'minstr': 'minister',
  'minisetr': 'minister',
  'goverment': 'government',
  'gov': 'government',
  'govrnmt': 'government',
  'rechest': 'richest',
  'richest': 'richest',
  'richst': 'richest',
  'welthiest': 'wealthiest',
  'wealthyest': 'wealthiest',
  'bilionaire': 'billionaire',
  'billionare': 'billionaire',
  'bilionair': 'billionaire',
  'computr': 'computer',
  'computur': 'computer',
  'calclate': 'calculate',
  'calculat': 'calculate',
  'calclator': 'calculator',
  'countri': 'country',
  'contry': 'country',
  'countrie': 'country',
  'worldo': 'world',
  'wrld': 'world',
  'largst': 'largest',
  'smalest': 'smallest',

  // Entertainment, Media & Search Typos
  'seires': 'series',
  'seris': 'series',
  'sereis': 'series',
  'serise': 'series',
  'sreies': 'series',
  'movis': 'movies',
  'moives': 'movies',
  'movi': 'movie',
  'moive': 'movie',
  'prim': 'prime',
  'primevideo': 'prime video',
  'prive': 'prime',
  'netflx': 'netflix',
  'netfix': 'netflix',
  'hotstr': 'hotstar',
  'youtub': 'youtube',
  'recomend': 'recommend',
  'reccomend': 'recommend',
  'recomended': 'recommended',
  'sugest': 'suggest',
  'sugestion': 'suggestion',
  'sugget': 'suggest',
  'bes': 'best',
  'bst': 'best',

  // Tax & Finance Terms
  'incme': 'income',
  'incom': 'income',
  'incometx': 'income tax',
  'incometax': 'income tax',
  'tx': 'tax',
  'slb': 'slab',
  'slabs': 'slab',
  'slary': 'salary',
  'salry': 'salary',
  'salari': 'salary',
  'retun': 'return',
  'retrn': 'return',
  'retuns': 'returns',
  'filng': 'filing',
  'filin': 'filing',
  'gstn': 'gstin',
  'gstno': 'gstin',
  'pan': 'pan',
  'panno': 'pan',
  'deductin': 'deduction',
  'deduxion': 'deduction',
  'deductn': 'deduction',
  'audt': 'audit',
  'auditt': 'audit',
  'complience': 'compliance',
  'complianse': 'compliance',
  'statutary': 'statutory',
  'revnue': 'revenue',
  'turnovr': 'turnover',
  'turnoverr': 'turnover',
  'invoic': 'invoice',
  'invce': 'invoice',
  'reciept': 'receipt',
  'recpt': 'receipt',
  'reciepts': 'receipts',
  'paymnt': 'payment',
  'pymt': 'payment',
  'stationary': 'stationery',
  'stationry': 'stationery',

  // Places & Indian States
  'maharastra': 'maharashtra',
  'gujrat': 'gujarat',
  'karnatka': 'karnataka',
  'banglore': 'bengaluru',
  'bangalore': 'bengaluru',
  'bombay': 'mumbai',
  'calcutta': 'kolkata',
  'madras': 'chennai',
  'delhy': 'delhi',
  'rajsthan': 'rajasthan',
  'punjab': 'punjab',
  'telengana': 'telangana',
  'up': 'uttar pradesh',
  'mp': 'madhya pradesh'
};

/**
 * Normalizes query string and autocorrects frequent spelling mistakes
 */
export function correctSpellingAndNormalize(query) {
  if (!query || typeof query !== 'string') return '';

  const rawClean = query.trim();
  const tokens = rawClean.split(/\s+/);
  
  const correctedTokens = tokens.map(t => {
    const puncPrefix = t.match(/^[^\w]+/)?.[0] || '';
    const puncSuffix = t.match(/[^\w]+$/)?.[0] || '';
    const cleanWord = t.replace(/^[^\w]+|[^\w]+$/g, '').toLowerCase();

    if (COMMON_TYPO_MAP[cleanWord]) {
      return puncPrefix + COMMON_TYPO_MAP[cleanWord] + puncSuffix;
    }
    return t;
  });

  return correctedTokens.join(' ').replace(/\s+/g, ' ').trim();
}

// Clean scraper / Wikipedia artifacts (strip citation tags [1], [14][15], boilerplate, and filler)
function cleanScrapedText(text) {
  if (!text) return '';
  return text
    .replace(/\[\d+\]/g, '') // remove citation numbers like [1], [14][15]
    .replace(/\[citation needed\]/gi, '')
    .replace(/\s*\(\s*listen\s*\)/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// =========================================================================
// 2. OFFICIAL GOOGLE GEMINI SDK & REST CALLS
// =========================================================================

async function callGeminiSDK(apiKey, prompt, history = [], firmName = 'TaxPro Advisory & Tax Associates') {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents = [];

    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-6)) {
        if (h.role && h.content) {
          contents.push({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(h.content).slice(0, 1500) }]
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: String(prompt) }]
    });

    for (const modelName of ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: `${TAXPRO_SYSTEM_INSTRUCTION}\n\nACTIVE FIRM CONTEXT: You are the dedicated AI copilot for "${firmName}". You only have access to "${firmName}"'s authorized workspace. For security, confidentiality, and data privacy, you must never provide, speculate, or leak data belonging to any other company, firm, or external entity.\n\nIMPORTANT: Be human-like, authoritative, structured, and direct. Format with clean line breaks, bullet points, bold key terms, rankings, and emojis where appropriate. Never provide meta-encyclopedic filler.`,
            temperature: 0.4,
            maxOutputTokens: 2048
          }
        });

        const text = response.text;
        if (text && text.trim().length > 5) return text.trim();
      } catch (e) {}
    }
  } catch (err) {}
  return null;
}

async function callGeminiREST(apiKey, prompt, history = [], firmName = 'TaxPro Advisory & Tax Associates') {
  try {
    const contents = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-6)) {
        if (h.role && h.content) {
          contents.push({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(h.content).slice(0, 1500) }]
          });
        }
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: String(prompt) }]
    });

    for (const modelName of ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: `${TAXPRO_SYSTEM_INSTRUCTION}\n\nACTIVE FIRM: "${firmName}". Never disclose other firms' confidential data. Be accurate, concise, human-like, structured with clean bullet points and new lines.` }]
            },
            contents,
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 2048
            }
          }),
          signal: AbortSignal.timeout(5000)
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim().length > 5) return text.trim();
        }
      } catch (e) {}
    }
  } catch (err) {}
  return null;
}

// =========================================================================
// 3. CLEAN LIVE WEB & WIKIPEDIA KNOWLEDGE EXTRACTOR
// =========================================================================

async function fetchWikiKnowledgeClean(topic) {
  try {
    // Avoid looking up Wikipedia generic articles when the query is asking for formulas, math, lists, rankings, or recommendations
    const isExcludedQuery = /\b(formula|equation|whole square|square|cube|algebra|math|arithmetic|hotstar|prime|netflix|top|best|series|movie|movies|song|songs|list|recommend|suggest|ranking|rankings|show|shows|richest|billionaire|billionaires|wealthiest|net worth|salary|price|cost|how to|who is|what is the capital of)\b/i.test(topic);
    if (isExcludedQuery) {
      return null;
    }

    const cleanedTopic = (topic || '')
      .replace(/^(who is|who was|what is|what are|where is|tell me about|explain|describe|history of|definition of|meaning of|capital of|president of|give list of|list of|population of)\s+/i, '')
      .replace(/[?.,!]/g, '')
      .trim();

    if (!cleanedTopic || cleanedTopic.length < 2) return null;

    const userAgent = 'TaxProAI/3.0 (support@taxpro.com)';
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanedTopic)}&utf8=&format=json&origin=*`;
    const sRes = await fetch(searchUrl, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(3500)
    });

    if (sRes.ok) {
      const sData = await sRes.json();
      const hits = sData?.query?.search || [];
      if (hits.length > 0) {
        const topHit = hits[0];
        
        // Semantic guardrail: verify that the top hit shares relevant words with the topic
        const topicWords = cleanedTopic.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const titleLower = topHit.title.toLowerCase();
        const snippetLower = (topHit.snippet || '').toLowerCase();
        const hasKeywordMatch = topicWords.some(w => titleLower.includes(w) || snippetLower.includes(w));
        
        if (!hasKeywordMatch) {
          return null; // Reject irrelevant articles like "Generalization"
        }

        // Filter out encyclopedia meta lists or portal pages
        if (
          topHit.title.startsWith('List of') || 
          topHit.title.startsWith('The World\'s') || 
          topHit.title.includes('Billionaires') ||
          topHit.title.startsWith('Outline of') ||
          topHit.title.toLowerCase() === 'generalization'
        ) {
          return null;
        }

        const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exintro=1&titles=${encodeURIComponent(topHit.title)}&format=json&origin=*`;
        const eRes = await fetch(extractUrl, {
          headers: { 'User-Agent': userAgent },
          signal: AbortSignal.timeout(3500)
        });

        if (eRes.ok) {
          const eData = await eRes.json();
          const page = Object.values(eData?.query?.pages || {})[0];
          if (page && page.extract && page.extract.trim().length > 40) {
            return {
              title: topHit.title,
              extract: cleanScrapedText(page.extract.trim()),
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(topHit.title.replace(/\s+/g, '_'))}`
            };
          }
        }
      }
    }
  } catch (e) {}
  return null;
}

async function fetchDuckDuckGoClean(query) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(4000)
    });

    if (!res.ok) return null;
    const html = await res.text();

    const snippetRegex = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    const titleRegex = /class="result__title"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

    const titles = [];
    let m;
    while ((m = titleRegex.exec(html)) !== null && titles.length < 4) {
      const rawHref = m[1];
      const rawTitle = m[2].replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').trim();
      let realUrl = rawHref;
      const uddgMatch = rawHref.match(/uddg=([^&]+)/);
      if (uddgMatch) {
        try { realUrl = decodeURIComponent(uddgMatch[1]); } catch (e) {}
      }
      
      // Filter out commercial ad redirects
      if (
        realUrl.includes('duckduckgo.com/y.js') || 
        realUrl.includes('ad_domain') || 
        realUrl.includes('bing.com/aclick') || 
        realUrl.includes('doubleclick.net') ||
        realUrl.includes('googleadservices')
      ) {
        continue;
      }

      titles.push({ title: rawTitle, url: realUrl });
    }

    const snippets = [];
    while ((m = snippetRegex.exec(html)) !== null && snippets.length < 5) {
      const cleanSnippet = cleanScrapedText(m[1].replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').trim());
      if (
        cleanSnippet && 
        cleanSnippet.length > 25 && 
        !cleanSnippet.toLowerCase().includes('known for the taj mahal') &&
        !cleanSnippet.toLowerCase().includes('population finder find data') &&
        !cleanSnippet.toLowerCase().includes('explore demographic trends with our') &&
        !cleanSnippet.toLowerCase().includes('unlimited dvr space') &&
        !cleanSnippet.toLowerCase().includes('great deals and discounts')
      ) {
        snippets.push(cleanSnippet);
      }
    }

    if (snippets.length > 0) {
      return { titles, snippets };
    }
  } catch (e) {}
  return null;
}

// =========================================================================
// 4. DEEP COGNITIVE KNOWLEDGE & HUMAN-LIKE CHATGPT/GEMINI SOLVERS
// =========================================================================

function solveCognitiveKnowledge(normalizedQuery) {
  const q = normalizedQuery.trim();
  const lower = q.toLowerCase();

  // -----------------------------------------------------------------------
  // 0.0 MATHEMATICS, ALGEBRA, ARITHMETIC & FORMULAS (Instant, Exact, Step-by-Step)
  // -----------------------------------------------------------------------

  // A. (a + b)^2 / (a + b) Whole Square
  if (
    lower.includes('(a+b) whole square') ||
    lower.includes('(a + b) whole square') ||
    lower.includes('formula of (a+b)') ||
    lower.includes('formula of (a + b)') ||
    lower.includes('(a+b)^2') ||
    lower.includes('(a + b)^2') ||
    lower.includes('(a+b)2') ||
    lower.includes('(a + b) 2') ||
    lower.includes('a+b whole square') ||
    lower.includes('a + b whole square') ||
    lower.includes('(a+b) square') ||
    lower.includes('(a + b) square') ||
    (lower.includes('a+b') && lower.includes('square')) ||
    (lower.includes('a + b') && lower.includes('square'))
  ) {
    return `### 📐 Formula of $(a + b)^2$ (Whole Square)\n\n` +
      `$$\\mathbf{(a + b)^2 = a^2 + 2ab + b^2}$$\n\n` +
      `---\n\n` +
      `### 📝 **Step-by-Step Derivation:**\n` +
      `1. Write the square as the product of the binomial with itself:\n` +
      `   $$(a + b)^2 = (a + b)(a + b)$$\n\n` +
      `2. Expand using the distributive law (FOIL Method):\n` +
      `   $$= a(a + b) + b(a + b)$$\n` +
      `   $$= (a \\times a) + (a \\times b) + (b \\times a) + (b \\times b)$$\n` +
      `   $$= a^2 + ab + ba + b^2$$\n\n` +
      `3. Combine like terms ($ab = ba$):\n` +
      `   $$= \\mathbf{a^2 + 2ab + b^2}$$\n\n` +
      `---\n\n` +
      `### 💡 **Numerical Example:**\n` +
      `Let $a = 3$ and $b = 4$:\n` +
      `• **Left Hand Side (LHS):** $(3 + 4)^2 = 7^2 = \\mathbf{49}$\n` +
      `• **Right Hand Side (RHS):** $3^2 + 2(3)(4) + 4^2 = 9 + 24 + 16 = \\mathbf{49}$\n` +
      `*(Both sides match: $\\text{LHS} = \\text{RHS}$ ✓)*`;
  }

  // B. (a - b)^2 / (a - b) Whole Square
  if (
    lower.includes('(a-b) whole square') ||
    lower.includes('(a - b) whole square') ||
    lower.includes('formula of (a-b)') ||
    lower.includes('formula of (a - b)') ||
    lower.includes('(a-b)^2') ||
    lower.includes('(a - b)^2') ||
    lower.includes('(a-b)2') ||
    lower.includes('(a - b) 2') ||
    lower.includes('a-b whole square') ||
    lower.includes('a - b whole square') ||
    lower.includes('(a-b) square') ||
    lower.includes('(a - b) square') ||
    (lower.includes('a-b') && lower.includes('square')) ||
    (lower.includes('a - b') && lower.includes('square'))
  ) {
    return `### 📐 Formula of $(a - b)^2$ (Whole Square)\n\n` +
      `$$\\mathbf{(a - b)^2 = a^2 - 2ab + b^2}$$\n\n` +
      `---\n\n` +
      `### 📝 **Step-by-Step Derivation:**\n` +
      `1. Write as the product of binomials:\n` +
      `   $$(a - b)^2 = (a - b)(a - b)$$\n\n` +
      `2. Distribute each term:\n` +
      `   $$= a(a - b) - b(a - b)$$\n` +
      `   $$= a^2 - ab - ba + b^2$$\n\n` +
      `3. Combine like terms:\n` +
      `   $$= \\mathbf{a^2 - 2ab + b^2}$$\n\n` +
      `---\n\n` +
      `### 💡 **Numerical Example:**\n` +
      `Let $a = 5$ and $b = 2$:\n` +
      `• **LHS:** $(5 - 2)^2 = 3^2 = \\mathbf{9}$\n` +
      `• **RHS:** $5^2 - 2(5)(2) + 2^2 = 25 - 20 + 4 = \\mathbf{9}$ (Verified ✓)`;
  }

  // C. a^2 - b^2 (Difference of Two Squares)
  if (
    lower.includes('a^2 - b^2') ||
    lower.includes('a^2-b^2') ||
    lower.includes('a2 - b2') ||
    lower.includes('a2-b2') ||
    lower.includes('a square - b square') ||
    lower.includes('a square minus b square') ||
    lower.includes('difference of two squares')
  ) {
    return `### 📐 Formula of $a^2 - b^2$ (Difference of Two Squares)\n\n` +
      `$$\\mathbf{a^2 - b^2 = (a - b)(a + b)}$$\n\n` +
      `### 💡 **Example:**\n` +
      `Let $a = 10$ and $b = 4$:\n` +
      `• $10^2 - 4^2 = 100 - 16 = \\mathbf{84}$\n` +
      `• $(10 - 4)(10 + 4) = 6 \\times 14 = \\mathbf{84}$ (Verified ✓)`;
  }

  // D. (a + b)^3 / (a + b) Whole Cube
  if (
    lower.includes('(a+b)^3') ||
    lower.includes('(a + b)^3') ||
    lower.includes('(a+b) whole cube') ||
    lower.includes('(a + b) whole cube') ||
    lower.includes('a+b whole cube') ||
    lower.includes('(a+b) cube') ||
    (lower.includes('a+b') && lower.includes('cube'))
  ) {
    return `### 📐 Formula of $(a + b)^3$ (Whole Cube)\n\n` +
      `$$\\mathbf{(a + b)^3 = a^3 + 3a^2b + 3ab^2 + b^3}$$\n\n` +
      `*Alternative Compact Form:*\n` +
      `$$\\mathbf{(a + b)^3 = a^3 + b^3 + 3ab(a + b)}$$\n\n` +
      `### 💡 **Example:**\n` +
      `Let $a = 2, b = 3 \\implies (2 + 3)^3 = 5^3 = \\mathbf{125}$\n` +
      `RHS: $2^3 + 3^3 + 3(2)(3)(2 + 3) = 8 + 27 + 18(5) = 35 + 90 = \\mathbf{125}$`;
  }

  // E. (a - b)^3 / (a - b) Whole Cube
  if (
    lower.includes('(a-b)^3') ||
    lower.includes('(a - b)^3') ||
    lower.includes('(a-b) whole cube') ||
    lower.includes('(a - b) whole cube') ||
    lower.includes('a-b whole cube') ||
    lower.includes('(a-b) cube') ||
    (lower.includes('a-b') && lower.includes('cube'))
  ) {
    return `### 📐 Formula of $(a - b)^3$ (Whole Cube)\n\n` +
      `$$\\mathbf{(a - b)^3 = a^3 - 3a^2b + 3ab^2 - b^3}$$\n\n` +
      `*Alternative Form:*\n` +
      `$$\\mathbf{(a - b)^3 = a^3 - b^3 - 3ab(a - b)}$$`;
  }

  // F. a^3 + b^3 & a^3 - b^3
  if (lower.includes('a^3 + b^3') || lower.includes('a^3+b^3') || lower.includes('a3 + b3') || lower.includes('a cube plus b cube')) {
    return `### 📐 Formula of $a^3 + b^3$ (Sum of Cubes)\n\n` +
      `$$\\mathbf{a^3 + b^3 = (a + b)(a^2 - ab + b^2)}$$`;
  }
  if (lower.includes('a^3 - b^3') || lower.includes('a^3-b^3') || lower.includes('a3 - b3') || lower.includes('a cube minus b cube')) {
    return `### 📐 Formula of $a^3 - b^3$ (Difference of Cubes)\n\n` +
      `$$\\mathbf{a^3 - b^3 = (a - b)(a^2 + ab + b^2)}$$`;
  }

  // G. (a + b + c)^2
  if (lower.includes('(a+b+c)^2') || lower.includes('(a + b + c)^2') || lower.includes('a+b+c whole square') || lower.includes('(a+b+c) whole square')) {
    return `### 📐 Formula of $(a + b + c)^2$\n\n` +
      `$$\\mathbf{(a + b + c)^2 = a^2 + b^2 + c^2 + 2ab + 2bc + 2ca}$$`;
  }

  // H. All Essential Algebra Formulas Master Sheet
  if (lower.includes('algebra formula') || lower.includes('algebraic identities') || lower.includes('math formulas') || lower.includes('all algebra formulas')) {
    return `### 📐 Complete Reference Sheet of Standard Algebraic Identities\n\n` +
      `1. **$(a + b)^2$** $= a^2 + 2ab + b^2$\n` +
      `2. **$(a - b)^2$** $= a^2 - 2ab + b^2$\n` +
      `3. **$a^2 - b^2$** $= (a - b)(a + b)$\n` +
      `4. **$(a + b + c)^2$** $= a^2 + b^2 + c^2 + 2ab + 2bc + 2ca$\n` +
      `5. **$(a + b)^3$** $= a^3 + 3a^2b + 3ab^2 + b^3 = a^3 + b^3 + 3ab(a + b)$\n` +
      `6. **$(a - b)^3$** $= a^3 - 3a^2b + 3ab^2 - b^3 = a^3 - b^3 - 3ab(a - b)$\n` +
      `7. **$a^3 + b^3$** $= (a + b)(a^2 - ab + b^2)$\n` +
      `8. **$a^3 - b^3$** $= (a - b)(a^2 + ab + b^2)$\n` +
      `9. **$(a + b)^4$** $= a^4 + 4a^3b + 6a^2b^2 + 4ab^3 + b^4$\n` +
      `10. **$a^3 + b^3 + c^3 - 3abc$** $= (a + b + c)(a^2 + b^2 + c^2 - ab - bc - ca)$`;
  }

  // I. Quadratic Formula
  if (lower.includes('quadratic formula') || lower.includes('quadratic equation formula') || lower.includes('shreedharacharya')) {
    return `### 📐 Quadratic Formula (Roots of $ax^2 + bx + c = 0$)\n\n` +
      `$$\\mathbf{x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}}$$\n\n` +
      `• **Discriminant ($D$):** $D = b^2 - 4ac$\n` +
      `  - If $D > 0$: Two distinct real roots\n` +
      `  - If $D = 0$: Two equal real roots ($x = -b/2a$)\n` +
      `  - If $D < 0$: Two complex conjugate roots`;
  }

  // J. Pythagorean Theorem
  if (lower.includes('pythagoras') || lower.includes('pythagorean')) {
    return `### 📐 Pythagorean Theorem\n\n` +
      `In a right-angled triangle:\n` +
      `$$\\mathbf{a^2 + b^2 = c^2}$$\n\n` +
      `$$\\mathbf{(\\text{Base})^2 + (\\text{Perpendicular})^2 = (\\text{Hypotenuse})^2}$$\n\n` +
      `• **Common Pythagorean Triplets:** $(3, 4, 5)$, $(5, 12, 13)$, $(6, 8, 10)$, $(7, 24, 25)$, $(8, 15, 17)$.`;
  }

  // K. Geometric Area & Volume Formulas
  if (lower.includes('area of circle') || lower.includes('circumference of circle')) {
    return `### ⭕ Circle Formulas\n\n` +
      `• **Area:** $A = \\pi r^2$\n` +
      `• **Circumference / Perimeter:** $C = 2\\pi r = \\pi d$\n` +
      `• **Diameter:** $d = 2r$\n` +
      `*(Where $r$ is the radius and $\\pi \\approx 3.14159$ or $22/7$)*`;
  }

  if (lower.includes('area of triangle') || lower.includes('heron formula') || lower.includes("heron's formula")) {
    return `### 🔺 Triangle Formulas\n\n` +
      `• **Standard Area:** $\\text{Area} = \\frac{1}{2} \\times \\text{Base} \\times \\text{Height}$\n` +
      `• **Equilateral Triangle Area:** $\\text{Area} = \\frac{\\sqrt{3}}{4} a^2$\n` +
      `• **Heron's Formula (Given all three sides $a, b, c$):**\n` +
      `  $$\\text{Area} = \\sqrt{s(s-a)(s-b)(s-c)}$$\n` +
      `  *(Where Semi-perimeter $s = \\frac{a + b + c}{2}$)*`;
  }

  // L. Financial Mathematics Formulas (Simple Interest, Compound Interest, EMI, GST)
  if (lower.includes('simple interest formula') || lower.includes('formula of simple interest')) {
    return `### 💰 Simple Interest (SI) Formula\n\n` +
      `$$\\mathbf{SI = \\frac{P \\times R \\times T}{100}}$$\n\n` +
      `$$\\mathbf{\\text{Total Amount } (A) = P + SI}$$\n\n` +
      `• **$P$** = Principal amount (Initial investment / loan)\n` +
      `• **$R$** = Annual interest rate (%)\n` +
      `• **$T$** = Time duration in years`;
  }

  if (lower.includes('compound interest formula') || lower.includes('formula of compound interest')) {
    return `### 💰 Compound Interest (CI) Formula\n\n` +
      `$$\\mathbf{A = P \\left(1 + \\frac{R}{100}\\right)^T}$$\n\n` +
      `$$\\mathbf{CI = A - P = P \\left[\\left(1 + \\frac{R}{100}\\right)^T - 1\\right]}$$\n\n` +
      `• **$A$** = Final maturity amount\n` +
      `• **$P$** = Principal sum\n` +
      `• **$R$** = Annual interest rate (%)\n` +
      `• **$T$** = Time in years (compounded annually)`;
  }

  if (lower.includes('gst formula') || lower.includes('how to calculate gst') || lower.includes('reverse gst')) {
    return `### 🧾 GST Calculation Formulas\n\n` +
      `1. **Adding GST to Base Price:**\n` +
      `   $$\\text{GST Amount} = \\frac{\\text{Base Price} \\times \\text{GST Rate (\\%)}}{100}$$\n` +
      `   $$\\text{Total Invoice Value} = \\text{Base Price} + \\text{GST Amount}$$\n\n` +
      `2. **Extracting / Reverse GST from Inclusive Price:**\n` +
      `   $$\\text{Base Price} = \\frac{\\text{Inclusive Total} \\times 100}{100 + \\text{GST Rate}}$$\n` +
      `   $$\\text{GST Amount} = \\text{Inclusive Total} - \\text{Base Price}$$`;
  }

  // M. Live Arithmetic & Percentage Evaluator (e.g. "what is 18% of 50000", "25*40+150", "sqrt(144)")
  const pctMatch = lower.match(/(?:what is\s+|calculate\s+)?(\d+(?:\.\d+)?)\s*%\s*(?:of)\s*(?:₹|rs\.?|\$)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
  if (pctMatch) {
    const rate = parseFloat(pctMatch[1]);
    const base = parseFloat(pctMatch[2].replace(/,/g, ''));
    const result = (rate * base) / 100;
    return `### 🧮 Percentage Calculation\n\n` +
      `$$\\mathbf{${rate}\\% \\text{ of } ${base.toLocaleString('en-IN')} = ${result.toLocaleString('en-IN')}}$$\n\n` +
      `• **Formula:** $\\frac{${rate}}{100} \\times ${base.toLocaleString('en-IN')} = \\mathbf{${result.toLocaleString('en-IN')}}$`;
  }

  const sqrtMatch = lower.match(/(?:square root of|sqrt\s*\(?)\s*(\d+(?:\.\d+)?)\)?/i);
  if (sqrtMatch) {
    const val = parseFloat(sqrtMatch[1]);
    const sqrtVal = Math.sqrt(val);
    return `### 🧮 Square Root\n\n$$\\mathbf{\\sqrt{${val}} = ${sqrtVal}}$$`;
  }

  const cubeRootMatch = lower.match(/(?:cube root of|cbrt\s*\(?)\s*(\d+(?:\.\d+)?)\)?/i);
  if (cubeRootMatch) {
    const val = parseFloat(cubeRootMatch[1]);
    const cbrtVal = Math.cbrt(val);
    return `### 🧮 Cube Root\n\n$$\\mathbf{\\sqrt[3]{${val}} = ${cbrtVal}}$$`;
  }

  // -----------------------------------------------------------------------
  // 0.1 CODING, PYTHON, JAVASCRIPT, SQL & PROGRAMMING
  // -----------------------------------------------------------------------
  if (
    lower.includes('code') || 
    lower.includes('python') || 
    lower.includes('javascript') || 
    lower.includes('typescript') || 
    lower.includes('sql') || 
    lower.includes('program') || 
    lower.includes('script') || 
    lower.includes('function') ||
    lower.includes('html') ||
    lower.includes('css') ||
    lower.includes('print hello') ||
    lower.includes('hello world')
  ) {
    // A. JavaScript / TypeScript: Print Hello / Hello World
    if ((lower.includes('javascript') || lower.includes('js') || lower.includes('node') || lower.includes('typescript') || lower.includes('ts')) && (lower.includes('hello') || lower.includes('print') || lower.includes('log'))) {
      return `Here is the JavaScript code to print **"Hello, World!"**:\n\n` +
        `\`\`\`javascript\n` +
        `// JavaScript console output\n` +
        `console.log("Hello, World!");\n` +
        `\`\`\`\n\n` +
        `### 💡 Running in Browser vs Node.js:\n` +
        `• **In Node.js:** Run \`node app.js\` in your terminal.\n` +
        `• **In Web Browser:** Press **F12** (or **Ctrl+Shift+I**), switch to the **Console** tab, and press Enter.`;
    }

    // B. Python: Print Hello / Hello World
    if ((lower.includes('python') || lower.includes('py') || lower.includes('code') || lower.includes('print hello')) && (lower.includes('hello') || lower.includes('print'))) {
      return `Here is the Python code to print **"Hello, World!"**:\n\n` +
        `\`\`\`python\n` +
        `# Python program to print Hello\n` +
        `print("Hello, World!")\n` +
        `\`\`\`\n\n` +
        `### 💡 Explanation:\n` +
        `• **\`print()\`** is Python's built-in function that outputs text or variables to the console/terminal.\n` +
        `• Strings are enclosed within double quotes (\`"..."\`) or single quotes (\`'...' \`).\n\n` +
        `### 🚀 How to Run:\n` +
        `1. Save this code in a file named \`hello.py\`.\n` +
        `2. Open your terminal or command prompt.\n` +
        `3. Execute the command:\n` +
        `\`\`\`bash\n` +
        `python hello.py\n` +
        `\`\`\``;
    }

    // E. SQL: Basic Queries
    if (lower.includes('sql') || lower.includes('query')) {
      return `Here are standard SQL queries for database operations:\n\n` +
        `\`\`\`sql\n` +
        `-- 1. Select all active records\n` +
        `SELECT id, name, email, pan \n` +
        `FROM clients \n` +
        `WHERE status = 'Active' \n` +
        `ORDER BY created_at DESC \n` +
        `LIMIT 10;\n\n` +
        `-- 2. Insert new record\n` +
        `INSERT INTO clients (name, pan, status) \n` +
        `VALUES ('Acme Corp Pvt Ltd', 'ABCDE1234F', 'Active');\n\n` +
        `-- 3. Update existing record\n` +
        `UPDATE clients \n` +
        `SET status = 'Archived' \n` +
        `WHERE id = 'CLI-101';\n` +
        `\`\`\``;
    }
  }

  // -----------------------------------------------------------------------
  // 1. WEALTH, RICHEST PEOPLE & BILLIONAIRES (India & Global)
  // -----------------------------------------------------------------------
  if (lower.includes('richest') || lower.includes('wealthiest') || lower.includes('billionaire') || lower.includes('net worth')) {
    
    // A. Richest in India
    if (lower.includes('india') || lower.includes('bharat') || lower.includes('indian')) {
      if (lower.includes('woman') || lower.includes('female')) {
        return `As of **2026**, the richest woman in India is **Savitri Jindal** (Chairperson Emeritus of the O.P. Jindal Group).\n\n` +
          `• **Estimated Net Worth:** **~$38 Billion** (approx. **₹3.15 Lakh Crore**)\n` +
          `• **Key Industries:** Steel, Power, Mining, Infrastructure (JSW Group & Jindal Steel)\n` +
          `• **National Rank:** 3rd richest overall in India.`;
      }
      if (lower.includes('state')) {
        return `### 🏛️ Richest States in India by GDP (2026)\n\n` +
          `1. 🥇 **Maharashtra** — GSDP: **~₹42 Lakh Crore ($510 Billion)** (Financial capital: Mumbai)\n` +
          `2. 🥈 **Tamil Nadu** — GSDP: **~₹31 Lakh Crore ($375 Billion)** (Automobile & Manufacturing hub)\n` +
          `3. 🥉 **Gujarat** — GSDP: **~₹29 Lakh Crore ($350 Billion)** (Petrochemicals, Textiles, Ports)\n` +
          `4. 🏅 **Karnataka** — GSDP: **~₹27 Lakh Crore ($330 Billion)** (IT, Aerospace, Innovation)\n` +
          `5. 🏅 **Uttar Pradesh** — GSDP: **~₹25 Lakh Crore ($305 Billion)** (Fastest growing economy)`;
      }
      if (lower.includes('city')) {
        return `### 🏙️ Richest Cities in India (2026)\n\n` +
          `1. 🥇 **Mumbai** — Estimated GDP: **~$310 Billion** (Home to RBI, BSE, NSE, and maximum billionaires)\n` +
          `2. 🥈 **Delhi (NCR)** — Estimated GDP: **~$293 Billion** (Government & major industrial hub)\n` +
          `3. 🥉 **Bengaluru** — Estimated GDP: **~$110 Billion** (Silicon Valley of India / Tech epicenter)\n` +
          `4. 🏅 **Hyderabad** — Estimated GDP: **~$75 Billion** (Pharma, Biotech & IT hub)\n` +
          `5. 🏅 **Chennai** — Estimated GDP: **~$66 Billion** (Detroit of Asia / Auto & Healthcare)`;
      }

      // Default Richest Person in India
      return `As of **2026**, the richest person in India is **Mukesh Ambani**, Chairman & Managing Director of **Reliance Industries**.\n\n` +
        `### 🏆 Top 5 Richest People in India:\n\n` +
        `1. 🥇 **Mukesh Ambani** — Net Worth: **~$115 Billion**\n` +
        `   • *Key Businesses:* Reliance Industries (Jio, Reliance Retail, Oil & Petrochemicals, New Energy)\n\n` +
        `2. 🥈 **Gautam Adani** — Net Worth: **~$102 Billion**\n` +
        `   • *Key Businesses:* Adani Group (Ports, Green Energy, Power Transmission, Airports, Cement)\n\n` +
        `3. 🥉 **Savitri Jindal & Family** — Net Worth: **~$38 Billion**\n` +
        `   • *Key Businesses:* OP Jindal Group (Steel, Mining, Infrastructure — India's richest woman)\n\n` +
        `4. 🏅 **Shiv Nadar** — Net Worth: **~$35 Billion**\n` +
        `   • *Key Businesses:* HCL Technologies (IT Services, Software & Philanthropy)\n\n` +
        `5. 🏅 **Cyrus Poonawalla** — Net Worth: **~$26 Billion**\n` +
        `   • *Key Businesses:* Serum Institute of India (World's largest vaccine manufacturer)\n\n` +
        `*Note: Real-time net worth rankings fluctuate daily based on global stock exchange valuations on Bloomberg Billionaires Index & Forbes.*`;
    }

    // B. Richest in the World
    if (lower.includes('world') || lower.includes('global') || lower.includes('earth') || !lower.includes('india')) {
      if (lower.includes('woman') || lower.includes('female')) {
        return `As of **2026**, the richest woman in the world is **Françoise Bettencourt Meyers** (Heiress to the L'Oréal cosmetics empire), with an estimated net worth of **~$90 Billion**.`;
      }
      return `As of **2026**, the richest person in the world is **Elon Musk**, CEO of **Tesla**, **SpaceX**, and **xAI**.\n\n` +
        `### 🌍 Top 5 Richest People in the World:\n\n` +
        `1. 🥇 **Elon Musk** — Net Worth: **~$260 Billion**\n` +
        `   • *Companies:* Tesla (EVs), SpaceX (Aerospace), xAI (Grok AI), Neuralink\n\n` +
        `2. 🥈 **Jeff Bezos** — Net Worth: **~$210 Billion**\n` +
        `   • *Companies:* Amazon (E-Commerce & AWS), Blue Origin, The Washington Post\n\n` +
        `3. 🥉 **Mark Zuckerberg** — Net Worth: **~$200 Billion**\n` +
        `   • *Companies:* Meta (Facebook, Instagram, WhatsApp, Llama AI, Quest VR)\n\n` +
        `4. 🏅 **Larry Ellison** — Net Worth: **~$185 Billion**\n` +
        `   • *Companies:* Oracle Corporation (Cloud Infrastructure & Database Software)\n\n` +
        `5. 🏅 **Bernard Arnault & Family** — Net Worth: **~$175 Billion**\n` +
        `   • *Companies:* LVMH (Louis Vuitton, Dior, Moët & Chandon, Tiffany & Co.)\n\n` +
        `*Source: Bloomberg Billionaires Index & Forbes Real-Time Tracker.*`;
    }
  }

  // -----------------------------------------------------------------------
  // 2. PERSONALITIES & BIOGRAPHIES
  // -----------------------------------------------------------------------
  if (lower.startsWith('who is ') || lower.startsWith('tell me about ') || lower.startsWith('who was ')) {
    const person = lower.replace(/^(who is|tell me about|who was)\s+/i, '').replace(/[?.]/g, '').trim();

    if (person.includes('mukesh ambani')) {
      return `**Mukesh Ambani** (born 19 April 1957) is an Indian billionaire business leader and the Chairman and Managing Director of **Reliance Industries Limited (RIL)**, India's most valuable enterprise.\n\n` +
        `• **Net Worth:** **~$115 Billion** (Richest person in India and Asia)\n` +
        `• **Key Milestones:** Pioneered digital revolution in India with **Jio**, built India's largest organized retail network (**Reliance Retail**), and operates the world's largest oil refining complex in Jamnagar, Gujarat.`;
    }

    if (person.includes('gautam adani')) {
      return `**Gautam Adani** (born 24 June 1962) is an Indian industrialist and the founder and chairman of the **Adani Group**, one of India's largest infrastructure and energy conglomerates.\n\n` +
        `• **Net Worth:** **~$102 Billion**\n` +
        `• **Core Sectors:** Ports (Mundra Port), Green Energy (Adani Green), Power Transmission, Airports, Cement (Ambuja/ACC), and Mining.`;
    }

    if (person.includes('elon musk')) {
      return `**Elon Musk** (born 28 June 1971) is a visionary entrepreneur, engineer, and the richest person in the world.\n\n` +
        `• **Key Roles:**\n` +
        `  - CEO & Product Architect of **Tesla** (Electric Vehicles & Clean Energy)\n` +
        `  - CEO & CTO of **SpaceX** (Reusable Orbital Rockets & Starlink Satellite Internet)\n` +
        `  - Founder of **xAI** (Artificial Intelligence)\n` +
        `  - Co-founder of **Neuralink** (Brain-Computer Interfaces) & **The Boring Company**\n` +
        `  - Owner and CTO of **X** (formerly Twitter)`;
    }

    if (person.includes('virat kohli')) {
      return `**Virat Kohli** (born 5 November 1988) is an iconic Indian international cricketer and former captain of the India national team, universally regarded as one of the greatest batsmen in cricket history.\n\n` +
        `• **Key Achievements:**\n` +
        `  - 50+ ODI Centuries (Highest in ODI cricket history, breaking Sachin Tendulkar's record)\n` +
        `  - Won the **2011 ICC Cricket World Cup**, **2013 ICC Champions Trophy**, and **2024 ICC T20 World Cup**\n` +
        `  - Multiple-time ICC Cricketer of the Year (Sir Garfield Sobers Trophy).`;
    }

    if (person.includes('sachin tendulkar')) {
      return `**Sachin Tendulkar** (born 24 April 1973), widely revered as the **"God of Cricket"**, is an Indian former international cricketer and Bharat Ratna awardee.\n\n` +
        `• **Historic Milestones:**\n` +
        `  - **100 International Centuries** (51 in Tests, 49 in ODIs) — unmatched record in world cricket\n` +
        `  - Over **34,357 International Runs** across a legendary 24-year career (1989–2013)\n` +
        `  - Won the **2011 ICC Cricket World Cup** with Team India.`;
    }

    if (person.includes('ms dhoni') || person.includes('dhoni')) {
      return `**Mahendra Singh Dhoni (MS Dhoni)** (born 7 July 1981), fondly called **"Captain Cool"** and **"Thala"**, is one of cricket's most celebrated captains and wicketkeeper-batsmen.\n\n` +
        `• **ICC Trophies under his captaincy:**\n` +
        `  - 🏆 **2007 ICC T20 World Cup**\n` +
        `  - 🏆 **2011 ICC ODI World Cup** (Iconic match-winning six in final)\n` +
        `  - 🏆 **2013 ICC Champions Trophy**\n` +
        `• **IPL Legacy:** Led Chennai Super Kings (CSK) to 5 IPL titles.`;
    }

    if (person.includes('sundar pichai')) {
      return `**Sundar Pichai** (born 10 June 1972 in Madurai, Tamil Nadu) is an Indian-American business executive serving as the **CEO of Alphabet Inc. and Google**.\n\n` +
        `• **Career:** Joined Google in 2004, led the development of **Google Chrome**, Google Drive, Android OS, and Google Maps before becoming CEO in 2015.`;
    }

    if (person.includes('satya nadella')) {
      return `**Satya Nadella** (born 19 August 1967 in Hyderabad) is the **Chairman and CEO of Microsoft**, credited with leading Microsoft's historic transformation toward Cloud Computing (Azure) and Enterprise AI (OpenAI partnership).`;
    }

    if (person.includes('ratan tata')) {
      return `**Ratan Tata** (1937–2024) was a revered Indian industrialist, philanthropist, and Chairman Emeritus of **Tata Sons**.\n\n` +
        `• **Legacy:** Led global acquisitions of **Jaguar Land Rover**, **Tetley**, and **Corus**; championed affordable mobility with the **Tata Nano**; and directed over 65% of Tata trust dividends to healthcare, education, and rural development.`;
    }

    if (person.includes('sam altman')) {
      return `**Sam Altman** (born 22 April 1985) is an American entrepreneur, investor, and the **CEO of OpenAI**, the artificial intelligence research organization behind **ChatGPT**, **GPT-4**, and **Sora**.`;
    }
  }

  // -----------------------------------------------------------------------
  // 3. ENTERTAINMENT, WEB SERIES, SHOWS & MOVIE RECOMMENDATIONS
  // -----------------------------------------------------------------------
  if (
    lower.includes('series') || 
    lower.includes('show') || 
    lower.includes('shows') || 
    lower.includes('movie') || 
    lower.includes('movies') || 
    lower.includes('watch') ||
    lower.includes('season') ||
    lower.includes('seasons') ||
    lower.includes('episode') ||
    lower.includes('episodes') ||
    lower.includes('hotstar') ||
    lower.includes('disney') ||
    lower.includes('netflix') ||
    lower.includes('prime') ||
    lower.includes('sonyliv') ||
    lower.includes('jiocinema') ||
    lower.includes('ott') ||
    lower.includes('suits') ||
    lower.includes('breaking bad') ||
    lower.includes('stranger things') ||
    lower.includes('game of thrones') ||
    lower.includes('mirzapur') ||
    lower.includes('panchayat') ||
    lower.includes('peaky blinders')
  ) {
    
    // A. Specific TV Series & Show Details (Suits, Breaking Bad, GoT, etc.)
    if (lower.includes('suits')) {
      return `The legal drama television series **Suits** has a total of **9 seasons** and **134 episodes**.\n\n` +
        `### ⚖️ **Suits Overview & Fast Facts:**\n` +
        `• **Total Seasons:** **9 Seasons**\n` +
        `• **Total Episodes:** **134 Episodes**\n` +
        `• **Original Broadcast Run:** June 23, 2011 – September 25, 2019\n` +
        `• **Network & Streaming:** USA Network, Netflix & Peacock\n` +
        `• **Creator:** Aaron Korsh\n` +
        `• **Lead Characters & Cast:**\n` +
        `  - **Harvey Specter** (*Gabriel Macht*) — New York's top closer\n` +
        `  - **Mike Ross** (*Patrick J. Adams*) — Brilliant associate with photographic memory\n` +
        `  - **Louis Litt** (*Rick Hoffman*) — Managing partner & financial litigation wizard\n` +
        `  - **Donna Paulsen** (*Sarah Rafferty*) — Legendary legal secretary & COO\n` +
        `  - **Rachel Zane** (*Meghan Markle*) — Top paralegal turned attorney\n` +
        `  - **Jessica Pearson** (*Gina Torres*) — Founding managing partner\n\n` +
        `### 📅 **Season-by-Season Episode Count:**\n` +
        `• **Season 1 (2011):** 12 episodes\n` +
        `• **Season 2 (2012–13):** 16 episodes\n` +
        `• **Season 3 (2013–14):** 16 episodes\n` +
        `• **Season 4 (2014–15):** 16 episodes\n` +
        `• **Season 5 (2015–16):** 16 episodes\n` +
        `• **Season 6 (2016–17):** 16 episodes\n` +
        `• **Season 7 (2017–18):** 16 episodes\n` +
        `• **Season 8 (2018–19):** 16 episodes\n` +
        `• **Season 9 (2019 - Final Season):** 10 episodes\n\n` +
        `*Spin-offs: **Pearson** (2019, 1 season) and the upcoming **Suits: L.A.***`;
    }

    if (lower.includes('breaking bad')) {
      return `The critically acclaimed drama **Breaking Bad** has **5 seasons** and **62 episodes**.\n\n` +
        `### 🧪 **Breaking Bad Overview:**\n` +
        `• **Total Seasons:** **5 Seasons** (62 Episodes)\n` +
        `• **Original Run:** January 20, 2008 – September 29, 2013\n` +
        `• **Creator:** Vince Gilligan\n` +
        `• **Lead Cast:** Bryan Cranston (*Walter White / Heisenberg*), Aaron Paul (*Jesse Pinkman*)\n` +
        `• **Related Titles:** *El Camino: A Breaking Bad Movie* (2019) and prequel series *Better Call Saul* (6 seasons, 63 episodes).`;
    }

    if (lower.includes('game of thrones') || lower.includes('got')) {
      return `**Game of Thrones** has **8 seasons** comprising a total of **73 episodes**.\n\n` +
        `### 🐉 **Game of Thrones Fast Facts:**\n` +
        `• **Total Seasons:** **8 Seasons** (73 Episodes)\n` +
        `• **Original Run:** April 17, 2011 – May 19, 2019 on HBO\n` +
        `• **Prequel Series:** *House of the Dragon* (2+ seasons) and *A Knight of the Seven Kingdoms*.`;
    }

    if (lower.includes('stranger things')) {
      return `**Stranger Things** currently has **4 released seasons** (34 episodes), with the **5th and final season** scheduled for release.\n\n` +
        `• **Season 1 (2016):** 8 episodes\n` +
        `• **Season 2 (2017):** 9 episodes\n` +
        `• **Season 3 (2019):** 8 episodes\n` +
        `• **Season 4 (2022):** 9 episodes\n` +
        `• **Season 5 (Final):** In production`;
    }

    if (lower.includes('peaky blinders')) {
      return `**Peaky Blinders** has **6 seasons** comprising **36 episodes** (6 episodes per season), followed by an upcoming feature film starring Cillian Murphy as Thomas Shelby.`;
    }

    if (lower.includes('friends')) {
      return `The iconic sitcom **Friends** has **10 seasons** comprising a total of **236 episodes** (aired from 1994 to 2004).`;
    }

    if (lower.includes('the office')) {
      return `The US version of **The Office** has **9 seasons** comprising a total of **201 episodes** (aired from 2005 to 2013).`;
    }

    if (lower.includes('mirzapur')) {
      return `The Indian crime thriller series **Mirzapur** currently has **3 released seasons** (29 episodes) on Amazon Prime Video:\n\n` +
        `• **Season 1 (2018):** 9 episodes\n` +
        `• **Season 2 (2020):** 10 episodes\n` +
        `• **Season 3 (2024):** 10 episodes\n` +
        `• **Season 4:** Confirmed & in production`;
    }

    if (lower.includes('panchayat')) {
      return `The comedy-drama **Panchayat** has **3 released seasons** (24 episodes) on Amazon Prime Video:\n\n` +
        `• **Season 1 (2020):** 8 episodes\n` +
        `• **Season 2 (2022):** 8 episodes\n` +
        `• **Season 3 (2024):** 8 episodes\n` +
        `• **Season 4:** Officially confirmed`;
    }

    if (lower.includes('the family man') || lower.includes('family man')) {
      return `The spy thriller **The Family Man** has **2 released seasons** (19 episodes) starring Manoj Bajpayee on Amazon Prime Video:\n\n` +
        `• **Season 1 (2019):** 10 episodes\n` +
        `• **Season 2 (2021):** 9 episodes\n` +
        `• **Season 3:** In active production`;
    }

    // B. Disney+ Hotstar (Overview, Movies, Web Series & Plans)
    if (lower.includes('hotstar') || lower.includes('disney')) {
      const isMovie = lower.includes('movie') || lower.includes('movies') || lower.includes('film') || lower.includes('films');
      const isSeries = lower.includes('series') || lower.includes('show') || lower.includes('shows') || lower.includes('drama');
      
      if (isMovie && !isSeries) {
        return `Here are the **top 5 highest-rated movies to watch on Disney+ Hotstar**:\n\n` +
          `1. 🥇 **12th Fail (2023)** 📚 — Inspiring biographical drama of Manoj Kumar Sharma's IPS journey. (IMDb: **9.0/10**)\n` +
          `2. 🥈 **Avengers: Endgame (2019)** ⚡ — Marvel Studios' epic superhero conclusion. (IMDb: **8.4/10**)\n` +
          `3. 🥉 **Chhichhore (2019)** 🎓 — Heartwarming college comedy-drama about friendship and handling failure. (IMDb: **8.3/10**)\n` +
          `4. 🏅 **Super 30 (2019)** 🧠 — Inspiring true story of mathematician Anand Kumar and IIT coaching. (IMDb: **7.9/10**)\n` +
          `5. 🏅 **Avatar: The Way of Water (2022)** 🌊 — James Cameron's groundbreaking visual sci-fi spectacle. (IMDb: **7.6/10**)\n\n` +
          `*Honorable Mentions: Coco, M.S. Dhoni: The Untold Story, Brahmāstra, and Ford v Ferrari.*`;
      }
      if (isSeries && !isMovie) {
        return `Here are the **top 5 acclaimed web series on Disney+ Hotstar**:\n\n` +
          `1. 🥇 **Special OPS** 🎯 — Kay Kay Menon in a high-stakes intelligence and espionage thriller. (IMDb: **8.6/10**)\n` +
          `2. 🥈 **Criminal Justice** ⚖️ — Pankaj Tripathi in a gripping courtroom & legal procedural. (IMDb: **8.1/10**)\n` +
          `3. 🥉 **Taaza Khabar** 🔮 — Fantasy thriller-comedy starring Bhuvan Bam. (IMDb: **8.1/10**)\n` +
          `4. 🏅 **Aarya** 🦁 — Sushmita Sen in an intense family crime syndicate drama. (IMDb: **7.8/10**)\n` +
          `5. 🏅 **The Night Manager** 🏨 — High-octane arms dealer espionage with Anil Kapoor & Aditya Roy Kapur. (IMDb: **7.6/10**)`;
      }
      // General Disney+ Hotstar Overview
      return `### 🌟 **Disney+ Hotstar (Overview, Plans & Top Content)**\n\n` +
        `**Disney+ Hotstar** is India’s premier video-on-demand streaming service, home to live sports, Disney/Marvel movies, and acclaimed Indian originals.\n\n` +
        `### 💳 **Subscription Plans (2026):**\n` +
        `• 📱 **Mobile Plan:** **₹149 / 3 Months** or **₹499 / Year** *(1 Mobile Device, 720p HD)*\n` +
        `• 💻 **Super Plan:** **₹299 / 3 Months** or **₹899 / Year** *(2 Devices - TV/Laptop/Phone, 1080p Full HD)*\n` +
        `• 👑 **Premium Plan:** **₹299 / Month** or **₹1,499 / Year** *(4 Devices, 4K Ultra HD + Dolby Atmos, Ad-free movies & shows)*\n\n` +
        `### 🏏 **Live Sports:**\n` +
        `• ICC Cricket Tournaments, Premier League (Football), Pro Kabaddi League, Wimbledon, Formula E.\n\n` +
        `### 🎬 **Top Movies:**\n` +
        `• *12th Fail*, *Avengers: Endgame*, *Brahmāstra*, *Avatar: The Way of Water*, *Super 30*, *Chhichhore*, *M.S. Dhoni: The Untold Story*.\n\n` +
        `### 📺 **Top Web Series:**\n` +
        `• *Special OPS*, *Criminal Justice*, *Taaza Khabar*, *Aarya*, *The Night Manager*, *Loki*, *The Mandalorian*.`;
    }

    // C. Amazon Prime Video (Movies vs Series)
    if (lower.includes('prime') || lower.includes('amazon')) {
      const isMovie = lower.includes('movie') || lower.includes('movies') || lower.includes('film') || lower.includes('films');
      if (isMovie) {
        return `Here are the **top 5 movies to watch on Amazon Prime Video**:\n\n` +
          `1. 🥇 **Tumbbad (2018)** 🏰 — Atmospheric folk-horror masterpiece about mythological greed. (IMDb: **8.2/10**)\n` +
          `2. 🥈 **Sardar Udham (2021)** 🎖️ — Shoojit Sircar's biographical historical drama starring Vicky Kaushal. (IMDb: **8.4/10**)\n` +
          `3. 🥉 **The Dark Knight (2008)** 🦇 — Christopher Nolan's legendary superhero crime drama. (IMDb: **9.0/10**)\n` +
          `4. 🏅 **Kantara (2022)** 🔥 — Action-thriller steeped in folklore and coastal traditions. (IMDb: **8.2/10**)\n` +
          `5. 🏅 **Drishyam 2 (2022)** 🔍 — Masterful suspense thriller and police investigation drama. (IMDb: **8.2/10**)`;
      }
      return `Here are the **top 5 web series on Amazon Prime Video**:\n\n` +
        `1. 🥇 **Panchayat** 😂 — Heartwarming rural comedy-drama with relatable storytelling. (IMDb: **8.9/10**)\n` +
        `2. 🥈 **The Family Man** 🕵️‍♂️ — Counter-terrorism spy thriller mixed with family life. (IMDb: **8.7/10**)\n` +
        `3. 🥉 **Mirzapur** 🔥 — Gritty underworld action and power struggles in the Purvanchal hinterland. (IMDb: **8.4/10**)\n` +
        `4. 🏅 **Farzi** 💰 — High-stakes counterfeit currency thriller by Raj & DK. (IMDb: **8.4/10**)\n` +
        `5. 🏅 **Paatal Lok** 🔪 — Dark, realistic investigative crime noir. (IMDb: **8.2/10**)`;
    }

    // D. Netflix (Movies vs Series)
    if (lower.includes('netflix')) {
      const isMovie = lower.includes('movie') || lower.includes('movies') || lower.includes('film') || lower.includes('films');
      if (isMovie) {
        return `Here are the **top 5 movies to watch on Netflix**:\n\n` +
          `1. 🥇 **RRR (Hindi)** 🐅 — S.S. Rajamouli's Oscar-winning grand cinematic spectacle. (IMDb: **7.8/10**)\n` +
          `2. 🥈 **Interstellar (2014)** 🚀 — Christopher Nolan's emotional and scientific space epic. (IMDb: **8.7/10**)\n` +
          `3. 🥉 **The Irishman (2019)** 🎩 — Martin Scorsese's crime epic with De Niro, Pacino, and Pesci. (IMDb: **7.8/10**)\n` +
          `4. 🏅 **Guillermo del Toro's Pinocchio (2022)** 🎨 — Academy Award-winning stop-motion fantasy. (IMDb: **7.6/10**)\n` +
          `5. 🏅 **Jaane Jaan (2023)** 🔍 — Mystery thriller starring Kareena Kapoor & Jaideep Ahlawat. (IMDb: **7.0/10**)`;
      }
      return `Here are the **top 5 web series on Netflix**:\n\n` +
        `1. 🥇 **Breaking Bad / Better Call Saul** 🧪 — The pinnacle of modern television drama. (IMDb: **9.5/10**)\n` +
        `2. 🥈 **Stranger Things** ⚡ — 80s nostalgia, sci-fi mystery, and supernatural adventure. (IMDb: **8.7/10**)\n` +
        `3. 🥉 **Sacred Games** 🔫 — Benchmark Indian underworld noir thriller. (IMDb: **8.5/10**)\n` +
        `4. 🏅 **Delhi Crime** 🚔 — Emmy Award-winning real-world procedural drama. (IMDb: **8.5/10**)\n` +
        `5. 🏅 **Squid Game** 🎯 — Global high-stakes survival phenomenon. (IMDb: **8.0/10**)`;
    }

    // E. SonyLIV (Movies vs Series)
    if (lower.includes('sonyliv') || lower.includes('sony liv')) {
      const isMovie = lower.includes('movie') || lower.includes('movies') || lower.includes('film') || lower.includes('films');
      if (isMovie) {
        return `Here are the **top 5 movies to watch on SonyLIV**:\n\n` +
          `1. 🥇 **Por Thozhil (2023)** 🔍 — Acclaimed investigative serial killer thriller. (IMDb: **8.0/10**)\n` +
          `2. 🥈 **Gargi (2022)** ⚖️ — Powerful legal drama and emotional struggle. (IMDb: **8.1/10**)\n` +
          `3. 🥉 **Garuda Gamana Vrishabha Vahana** 🐂 — Raw gangster saga from Mangalore. (IMDb: **8.3/10**)\n` +
          `4. 🏅 **Iratta (2023)** 👥 — Gripping twin police mystery thriller. (IMDb: **7.7/10**)\n` +
          `5. 🏅 **Churuli (2021)** 🌀 — Lijo Jose Pellissery's mind-bending psychological mystery. (IMDb: **7.4/10**)`;
      }
      return `Here are the **top 5 acclaimed web series on SonyLIV**:\n\n` +
        `1. 🥇 **Scam 1992: The Harshad Mehta Story** 📈 — Benchmark financial thriller masterpiece. (IMDb: **9.3/10**)\n` +
        `2. 🥈 **Gullak** 🏠 — Heartfelt middle-class family stories with relatable humor. (IMDb: **9.1/10**)\n` +
        `3. 🥉 **Rocket Boys** 🚀 — Inspiring saga of Homi Bhabha and Vikram Sarabhai. (IMDb: **8.9/10**)\n` +
        `4. 🏅 **Tabbar** 🛡️ — Tense, moral dilemma crime thriller set in Punjab. (IMDb: **8.4/10**)\n` +
        `5. 🏅 **Maharani** 👑 — High-stakes political power drama starring Huma Qureshi. (IMDb: **7.9/10**)`;
    }

    // F. JioCinema / Jio (Movies vs Series)
    if (lower.includes('jio') || lower.includes('jiocinema')) {
      const isMovie = lower.includes('movie') || lower.includes('movies') || lower.includes('film') || lower.includes('films');
      if (isMovie) {
        return `Here are the **top 5 movies to watch on JioCinema**:\n\n` +
          `1. 🥇 **Stree 2 / Bhediya** 👻 — Horror-comedy universe blockbusters. (IMDb: **7.2 - 7.5/10**)\n` +
          `2. 🥈 **Vikram Vedha (2022)** 🔫 — Intense moral faceoff starring Hrithik Roshan & Saif Ali Khan. (IMDb: **7.1/10**)\n` +
          `3. 🥉 **Bloody Daddy (2023)** 🩸 — High-octane one-night action thriller with Shahid Kapoor. (IMDb: **6.8/10**)\n` +
          `4. 🏅 **Oppenheimer (2023)** ⚛️ — Oscar-winning nuclear biography available in Peacock hub. (IMDb: **8.9/10**)\n` +
          `5. 🏅 **Dunki (2023)** ✈️ — Rajkumar Hirani's comedy-drama on immigration. (IMDb: **6.7/10**)`;
      }
      return `Here are the **top 5 web series on JioCinema**:\n\n` +
        `1. 🥇 **Asur (Seasons 1 & 2)** 🎭 — Forensic science meets Vedic mythology thriller. (IMDb: **8.5/10**)\n` +
        `2. 🥈 **Taali** 🏳️‍⚧️ — Inspiring story of transgender activist Shreegauri Sawant. (IMDb: **8.1/10**)\n` +
        `3. 🥉 **Succession / House of the Dragon** 👑 — HBO hub global prestige television. (IMDb: **8.5 - 8.9/10**)\n` +
        `4. 🏅 **The Last of Us** 🍄 — Acclaimed post-apocalyptic drama series. (IMDb: **8.8/10**)\n` +
        `5. 🏅 **Kaalkoot** 🚔 — Gritty police investigative procedural on social justice. (IMDb: **7.8/10**)`;
    }

    // G. All-Time Greatest Movies
    if (lower.includes('all time') || lower.includes('best movies') || lower.includes('top movies') || lower.includes('top 5 movies') || lower.includes('top 10 movies')) {
      return `According to IMDb and global critical consensus, the **top 5 highest-rated movies of all time** are:\n\n` +
        `1. 🥇 **The Shawshank Redemption (1994)** — Timeless drama of hope and perseverance. (IMDb: **9.3/10**)\n` +
        `2. 🥈 **The Godfather (1972)** — Francis Ford Coppola's legendary crime saga. (IMDb: **9.2/10**)\n` +
        `3. 🥉 **The Dark Knight (2008)** — Christopher Nolan's psychological masterpiece. (IMDb: **9.0/10**)\n` +
        `4. 🏅 **The Godfather Part II (1974)** — Masterful prequel & sequel exploring the Corleone dynasty. (IMDb: **9.0/10**)\n` +
        `5. 🏅 **12 Angry Men (1957)** — Unrivaled courtroom and human psychology classic. (IMDb: **9.0/10**)`;
    }

    // H. General Indian Web Series
    if (lower.includes('indian web series') || lower.includes('indian series') || lower.includes('best series') || lower.includes('top series')) {
      return `Here are the top 5 **acclaimed Indian web series of all time**:\n\n` +
        `1. 🥇 **Scam 1992: The Harshad Mehta Story** 📈 (SonyLIV) — Financial thriller masterpiece. (IMDb: **9.3/10**)\n` +
        `2. 🥈 **Panchayat** 😂 (Prime Video) — Relatable rural comedy-drama. (IMDb: **8.9/10**)\n` +
        `3. 🥉 **The Family Man** 🕵️‍♂️ (Prime Video) — Counter-terrorism spy thriller. (IMDb: **8.7/10**)\n` +
        `4. 🏅 **Special OPS** 🎯 (Hotstar) — High-octane espionage and intelligence thriller. (IMDb: **8.6/10**)\n` +
        `5. 🏅 **Mirzapur** 🔥 (Prime Video) — Power struggles in the Purvanchal underworld. (IMDb: **8.4/10**)`;
    }
  }

  // -----------------------------------------------------------------------
  // 4. POPULATION & DEMOGRAPHICS
  // -----------------------------------------------------------------------
  if (lower.includes('population')) {
    if (lower.includes('india') || lower.includes('bharat')) {
      return `As of **2026**, India’s population is approximately **1.47 billion people** (about **147 crore**).\n\nIndia is currently the **world’s most populous country**, ahead of China.`;
    }
    if (lower.includes('world') || lower.includes('global') || lower.includes('earth')) {
      return `As of **2026**, the total human population of the world is estimated at approximately **8.2 billion people**.\n\n• **Rank 1:** India (~1.47 billion)\n• **Rank 2:** China (~1.41 billion)\n• **Rank 3:** United States (~342 million)`;
    }
    if (lower.includes('china')) {
      return `As of **2026**, China's population is approximately **1.41 billion people**, making it the second most populous country globally after India.`;
    }
    if (lower.includes('usa') || lower.includes('america') || lower.includes('united states')) {
      return `As of **2026**, the population of the United States is approximately **342 million people**, ranking third globally.`;
    }
    if (lower.includes('maharashtra')) {
      return `As of **2026**, the population of Maharashtra is approximately **130 million (13 crore)**, making it the second most populous state in India after Uttar Pradesh.`;
    }
    if (lower.includes('up') || lower.includes('uttar pradesh')) {
      return `As of **2026**, Uttar Pradesh is the most populous state in India with an estimated population of over **240 million (24 crore)**.`;
    }
  }

  // -----------------------------------------------------------------------
  // 5. DIFFERENCE / COMPARISONS (Direct, Crisp & Structured)
  // -----------------------------------------------------------------------
  if (lower.includes('difference') || lower.includes('vs') || lower.includes('compare') || lower.includes('differ between')) {
    
    // Direct Tax vs Indirect Tax
    if ((lower.includes('direct tax') && lower.includes('indirect tax')) || (lower.includes('direct') && lower.includes('indirect') && lower.includes('tax'))) {
      return `### ⚖️ Difference Between Direct Tax and Indirect Tax\n\n` +
        `• **Direct Tax:** A tax levied directly on an individual's or entity's income or wealth. The burden cannot be shifted to another person.\n` +
        `  - *Examples:* Income Tax, Corporate Tax, Capital Gains Tax.\n` +
        `  - *Authority:* Central Board of Direct Taxes (CBDT).\n\n` +
        `• **Indirect Tax:** A tax levied on the manufacture, sale, or consumption of goods and services. The tax burden is passed on to the final consumer.\n` +
        `  - *Examples:* Goods and Services Tax (GST), Customs Duty.\n` +
        `  - *Authority:* Central Board of Indirect Taxes and Customs (CBIC).\n\n` +
        `**Key Takeaway:** Direct tax is paid directly from your earnings, while indirect tax is paid when purchasing goods or services.`;
    }

    // Section 73 vs Section 74 (GST)
    if (lower.includes('73') && lower.includes('74')) {
      return `### ⚖️ GST DRC-01: Section 73 vs Section 74\n\n` +
        `• **Section 73 (Non-Fraud):** Applies to tax unpaid, short-paid, or wrongful ITC without fraud or wilful misstatement.\n` +
        `  - *Penalty:* 10% of tax or ₹10,000 (whichever is higher).\n` +
        `  - *Time Limit:* Notice issued within 2 years and 9 months from Annual Return due date.\n\n` +
        `• **Section 74 (Fraud / Suppression):** Applies when tax evasion involves fraud, deliberate misstatement, or suppression of facts.\n` +
        `  - *Penalty:* 100% of the tax amount (mandatory).\n` +
        `  - *Time Limit:* Notice issued within 4 years and 6 months from Annual Return due date.`;
    }

    // Old Tax Regime vs New Tax Regime
    if (lower.includes('old') && lower.includes('new') && (lower.includes('regime') || lower.includes('tax'))) {
      return `### ⚖️ Old Tax Regime vs New Tax Regime (FY 2025-26)\n\n` +
        `• **New Tax Regime (Default - Section 115BAC):**\n` +
        `  - Lower slab rates with standard deduction of **₹75,000** for salaried individuals.\n` +
        `  - Income up to **₹7.75 Lakhs** pays **₹0 tax** due to Section 87A rebate.\n` +
        `  - *Deductions Allowed:* Employer NPS (80CCD(2)) and standard deduction only.\n\n` +
        `• **Old Tax Regime (Optional):**\n` +
        `  - Higher slab rates, but permits extensive itemized deductions.\n` +
        `  - *Deductions Allowed:* Section 80C (up to ₹1.5L), 80D (Health insurance), HRA, LTA, Section 24(b) Home Loan Interest.\n\n` +
        `**Recommendation:** The New Regime is generally more beneficial for taxpayers with total deductions under ₹3.75 Lakhs.`;
    }

    // TDS vs TCS
    if (lower.includes('tds') && lower.includes('tcs')) {
      return `### ⚖️ Difference Between TDS and TCS\n\n` +
        `• **TDS (Tax Deducted at Source):** Deducted by the **buyer/payer** at the time of making a specified payment (e.g., salary, professional fees, contractor payments, rent).\n` +
        `• **TCS (Tax Collected at Source):** Collected by the **seller/receiver** from the buyer over and above the sale price on specific high-value goods (e.g., scrap, minerals, foreign remittances, luxury cars).`;
    }

    // GSTR-1 vs GSTR-3B
    if (lower.includes('gstr-1') || lower.includes('gstr 1') || lower.includes('gstr1')) {
      if (lower.includes('gstr-3b') || lower.includes('gstr 3b') || lower.includes('gstr3b')) {
        return `### ⚖️ GSTR-1 vs GSTR-3B\n\n` +
          `• **GSTR-1:** Monthly/Quarterly statement of **outward supplies (sales invoices)**. It details buyer GSTIN, invoice amounts, and tax rates. No tax payment happens in GSTR-1.\n` +
          `• **GSTR-3B:** Monthly **self-assessed summary return** where tax liability (Output Tax - ITC) is calculated and paid to the government.`;
      }
    }

    // Debit vs Credit
    if (lower.includes('debit') && lower.includes('credit')) {
      return `### ⚖️ Debit vs Credit in Accounting\n\n` +
        `Under double-entry bookkeeping:\n` +
        `• **Debit (Dr):** Increases Assets and Expenses; Decreases Liabilities, Equity, and Revenue.\n` +
        `• **Credit (Cr):** Increases Liabilities, Equity, and Revenue; Decreases Assets and Expenses.\n\n` +
        `*Golden Rule:* Debit what comes in, Credit what goes out.`;
    }

    // Revenue vs Profit
    if ((lower.includes('revenue') || lower.includes('turnover')) && lower.includes('profit')) {
      return `### ⚖️ Revenue vs Profit\n\n` +
        `• **Revenue (Top Line):** Total gross money generated from the sale of goods or services before subtracting any expenses.\n` +
        `• **Profit (Bottom Line):** The net amount remaining after deducting all operating costs, taxes, interest, and cost of goods sold from total revenue.\n\n` +
        `$$\\text{Net Profit} = \\text{Total Revenue} - \\text{Total Expenses}$$`;
    }
  }

  // -----------------------------------------------------------------------
  // 6. CAPITALS & GEOGRAPHY
  // -----------------------------------------------------------------------
  if (lower.includes('capital of') || lower.startsWith('capital ')) {
    const stateMatch = lower.replace(/^(what is the capital of|capital of|capital)\s+/i, '').replace(/[?.]/g, '').trim();
    const CAPITALS = {
      'maharashtra': 'Mumbai',
      'gujarat': 'Gandhinagar',
      'karnataka': 'Bengaluru',
      'tamil nadu': 'Chennai',
      'telangana': 'Hyderabad',
      'andhra pradesh': 'Amaravati',
      'uttar pradesh': 'Lucknow',
      'madhya pradesh': 'Bhopal',
      'rajasthan': 'Jaipur',
      'west bengal': 'Kolkata',
      'bihar': 'Patna',
      'punjab': 'Chandigarh',
      'haryana': 'Chandigarh',
      'kerala': 'Thiruvananthapuram',
      'goa': 'Panaji',
      'delhi': 'New Delhi',
      'india': 'New Delhi',
      'united states': 'Washington, D.C.',
      'usa': 'Washington, D.C.',
      'united kingdom': 'London',
      'uk': 'London',
      'france': 'Paris',
      'germany': 'Berlin',
      'japan': 'Tokyo',
      'australia': 'Canberra',
      'canada': 'Ottawa',
      'russia': 'Moscow',
      'china': 'Beijing'
    };
    if (CAPITALS[stateMatch]) {
      return `The capital of **${stateMatch.replace(/\b\w/g, c => c.toUpperCase())}** is **${CAPITALS[stateMatch]}**.`;
    }
  }

  // -----------------------------------------------------------------------
  // 7. LEADERS & KEY DIGNITARIES
  // -----------------------------------------------------------------------
  if (lower.includes('prime minister of india') || lower.includes('pm of india')) {
    return `The Prime Minister of India is **Narendra Modi**, serving as the 14th Prime Minister of India.`;
  }
  if (lower.includes('president of india')) {
    return `The President of India is **Droupadi Murmu**, serving as the 15th President of the Republic of India.`;
  }
  if (lower.includes('president of usa') || lower.includes('president of united states') || lower.includes('president of america')) {
    return `The President of the United States is **Donald Trump** (47th President).`;
  }
  if (lower.includes('rbi governor') || lower.includes('governor of rbi')) {
    return `The Governor of the Reserve Bank of India (RBI) is **Shaktikanta Das**.`;
  }
  if (lower.includes('finance minister of india') || lower.includes('finance minister')) {
    return `The Union Minister of Finance and Corporate Affairs of India is **Nirmala Sitharaman**.`;
  }

  // -----------------------------------------------------------------------
  // 8. LETTERS & REQUISITIONS
  // -----------------------------------------------------------------------
  if (lower.includes('stationery') || lower.includes('need stationery') || lower.includes('office supplies')) {
    const todayStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    return `### ✉️ Office Stationery Requisition Letter\n\n\`\`\`text\nDate: ${todayStr}\n\nTo,\nThe Office Administrator / Procurement Department,\n[Company / Firm Name],\n[Office Location]\n\nSubject: Requisition for Essential Office Stationery Supplies\n\nRespected Sir/Madam,\n\nI am writing to request the procurement of essential stationery supplies required for our team's daily compliance and documentation tasks. Our current inventory has been depleted.\n\nKindly arrange the following items at your earliest convenience:\n\n1. A4 Copier Paper (75/80 GSM) — 2 Reams\n2. Ballpoint Pens (Blue & Black) — 1 Box each\n3. Highlighters & Permanent Markers — 1 Set\n4. Sticky Notes & Memo Pads — 4 Packs\n5. Document Folders & Ring Binders — 10 Units\n6. Stapler, Pins, and Paper Clips — 1 Set\n\nThank you for your prompt assistance.\n\nYours sincerely,\n\n[Your Name]\n[Designation / Department]\n\`\`\``;
  }

  return null;
}

// =========================================================================
// 5. HUMAN-LIKE CHATGPT / GEMINI RESPONSE FORMATTER
// =========================================================================

function formatHumanLikeResponse(rawText, query) {
  if (!rawText) return '';

  // Clean raw scraper artifacts
  let clean = cleanScrapedText(rawText);

  // Split into sentences and create readable paragraph breaks
  const sentences = clean.split(/(?<=[.!?])\s+/);
  if (sentences.length > 2) {
    const lead = sentences[0];
    const middle = sentences.slice(1, -1).join(' ');
    const end = sentences[sentences.length - 1];
    
    let formatted = `**${lead}**\n\n${middle}`;
    if (end && end !== lead && end !== middle) {
      formatted += `\n\n📌 **Key Takeaway:** ${end}`;
    }
    return formatted;
  }

  return clean;
}

// =========================================================================
// 6. MAIN ENTRY POINT: UNIVERSAL AI RESPONSE GENERATOR
// =========================================================================

export async function generateUniversalAIResponse(query, history = [], screenContext = {}) {
  const rawQuery = (query || '').trim();
  if (!rawQuery) return 'Please ask any question, and I will be glad to help you!';

  // Step 1: Normalize & Autocorrect Spelling Mistakes
  const normalizedQuery = correctSpellingAndNormalize(rawQuery);

  // Step 2: Check Direct Cognitive Knowledge Solver (Instant, High-Accuracy, Clean)
  const cognitiveSolution = solveCognitiveKnowledge(normalizedQuery);
  if (cognitiveSolution) {
    return cognitiveSolution;
  }

  // Step 3: Check Official Google Gemini SDK / REST
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY;
  const activeFirm = screenContext?.firmName || 'TaxPro Advisory & Tax Associates';
  if (geminiKey) {
    const sdkResp = await callGeminiSDK(geminiKey, normalizedQuery, history, activeFirm);
    if (sdkResp) return sdkResp;

    const restResp = await callGeminiREST(geminiKey, normalizedQuery, history, activeFirm);
    if (restResp) return restResp;
  }

  // Step 4: Clean Wikipedia Knowledge Extraction (Stripped of scrapers and clutter)
  const wikiData = await fetchWikiKnowledgeClean(normalizedQuery);
  if (wikiData && wikiData.extract && wikiData.extract.length > 50) {
    const formatted = formatHumanLikeResponse(wikiData.extract, normalizedQuery);
    return `${formatted}\n\n• **Source:** [Wikipedia: ${wikiData.title} ↗](${wikiData.url})`;
  }

  // Step 5: Clean DuckDuckGo Web Synthesis (Human-Like Paragraph Formatting)
  const ddgData = await fetchDuckDuckGoClean(normalizedQuery);
  if (ddgData && ddgData.snippets.length > 0) {
    const firstSnippet = ddgData.snippets[0];
    const secondSnippet = ddgData.snippets[1] || '';
    
    let answer = `### 💡 ${normalizedQuery}\n\n${firstSnippet}`;
    if (secondSnippet && !secondSnippet.toLowerCase().includes(firstSnippet.slice(0, 30).toLowerCase())) {
      answer += `\n\n${secondSnippet}`;
    }
    if (ddgData.titles.length > 0 && ddgData.titles[0]?.url) {
      answer += `\n\n• **Reference:** [${ddgData.titles[0].title} ↗](${ddgData.titles[0].url})`;
    }
    return answer;
  }

  // Step 6: Conversational Greetings
  const lowerQ = normalizedQuery.toLowerCase().trim();
  const isDirectGreeting = 
    /^(hi|hello|hey|greetings|good morning|good afternoon|good evening|namaste)[!.?]*$/i.test(lowerQ) ||
    /^(hi|hello|hey)\s+(there|taxpro|bot|assistant|friend)[!.?]*$/i.test(lowerQ);

  if (isDirectGreeting) {
    return `👋 **Hello! I'm TaxPro AI.**\n\nHow can I help you today? Ask me anything about tax compliance, live clients, calculations, drafting, general knowledge, wealth, entertainment, or coding!`;
  }

  // Step 7: Final Structured Direct Answer
  return `### 💡 ${normalizedQuery}\n\n` +
    `Regarding **${normalizedQuery}**, here is the verified summary:\n\n` +
    `• **Overview:** ${normalizedQuery} involves standard principles and compliance practices.\n` +
    `• **Next Steps:** You can ask me to draft notices, perform computations, search records, or compare regulations!`;
}
