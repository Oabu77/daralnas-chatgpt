/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * 🧠 Oliver Gates Workers AI — Cloudflare Edge Intelligence
 * ═══════════════════════════════════════════════════════════
 * © QuranChain™ | DarCloud™ | Dar Al-Nas Publishing™ | Omar Mohammad Abunadi™
 *
 * Cloudflare Workers AI-powered publishing assistant.
 * Uses @cf/meta/llama-3.1-8b-instruct for content generation,
 * @cf/baai/bge-base-en-v1.5 for embeddings/plagiarism detection,
 * and @cf/stabilityai/stable-diffusion-xl-base-1.0 for cover art.
 *
 * Capabilities:
 * - AI book content generation at the edge
 * - Cover art generation via Stable Diffusion
 * - Plagiarism similarity checking via embeddings
 * - SEO keyword generation for KDP listings
 * - Book description writing
 * - Real-time content moderation
 *
 * Routes: ai-publishing.darcloud.host, ai-books.darcloud.host
 * KDP Account: A2xq3izrirvour
 * FOUNDER_ROYALTY_RATE = 0.30 (IMMUTABLE)
 */

const AUTHOR_NAME = 'Oliver Gates';
const PUBLISHER_NAME = 'Dar Al-Nas Publishing™';
const KDP_ACCOUNT_ID = 'A2xq3izrirvour';
const FOUNDER_ROYALTY_RATE = 0.30;
const FOUNDER = 'Omar Mohammad Abunadi™';

// Models available on Workers AI
const MODELS = {
  TEXT: '@cf/meta/llama-3.1-8b-instruct',
  EMBEDDINGS: '@cf/baai/bge-base-en-v1.5',
  IMAGE: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
  SUMMARIZE: '@cf/facebook/bart-large-cnn',
  TRANSLATE: '@cf/meta/m2m100-1.2b',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ─── Routes ────────────────────────────────
      if (path === '/' || path === '') {
        return landingPage(corsHeaders);
      }

      if (path === '/health') {
        return json({
          service: 'oliver-gates-workers-ai',
          status: 'healthy',
          author: AUTHOR_NAME,
          publisher: PUBLISHER_NAME,
          kdp_account: KDP_ACCOUNT_ID,
          founder_royalty: FOUNDER_ROYALTY_RATE,
          models: Object.keys(MODELS),
          capabilities: [
            'text_generation', 'cover_art', 'embeddings',
            'plagiarism_check', 'seo_keywords', 'translation',
            'summarization', 'content_moderation',
          ],
          region: request.cf?.colo || 'unknown',
          ts: new Date().toISOString(),
        }, corsHeaders);
      }

      // ─── AI Text Generation ────────────────────
      if (path === '/api/ai/generate' && method === 'POST') {
        const body = await request.json();
        const prompt = body.prompt || body.topic || '';
        const genre = body.genre || 'general';
        const maxTokens = body.max_tokens || 2048;

        if (!prompt) {
          return json({ error: 'prompt is required' }, corsHeaders, 400);
        }

        const systemPrompt = `You are ${AUTHOR_NAME}, a bestselling author published by ${PUBLISHER_NAME}. ` +
          `You write engaging, original, well-researched content in the ${genre} genre. ` +
          `Your writing is clear, authoritative, and accessible. Never plagiarize. ` +
          `Always produce 100% original content.`;

        const result = await env.AI.run(MODELS.TEXT, {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
          temperature: body.temperature || 0.7,
        });

        return json({
          author: AUTHOR_NAME,
          genre,
          prompt: prompt.substring(0, 100),
          content: result.response,
          tokens_used: result.response?.length || 0,
          model: MODELS.TEXT,
          founder_royalty: FOUNDER_ROYALTY_RATE,
        }, corsHeaders);
      }

      // ─── Generate Book Chapter ─────────────────
      if (path === '/api/ai/chapter' && method === 'POST') {
        const body = await request.json();
        const { book_title, chapter_title, chapter_number, genre, outline } = body;

        if (!book_title || !chapter_title) {
          return json({ error: 'book_title and chapter_title required' }, corsHeaders, 400);
        }

        const prompt = `Write Chapter ${chapter_number || 1}: "${chapter_title}" ` +
          `for the book "${book_title}" by ${AUTHOR_NAME}. ` +
          (genre ? `Genre: ${genre}. ` : '') +
          (outline ? `Chapter outline: ${outline}. ` : '') +
          `Write approximately 3000-5000 words of engaging, original content. ` +
          `Include practical examples, clear explanations, and actionable insights. ` +
          `Start with an engaging opening paragraph that hooks the reader.`;

        const result = await env.AI.run(MODELS.TEXT, {
          messages: [
            {
              role: 'system',
              content: `You are ${AUTHOR_NAME}, a bestselling ${genre || 'non-fiction'} author. ` +
                `Write complete, detailed book chapters with depth and authority. ` +
                `Published by ${PUBLISHER_NAME}. Every word must be 100% original.`,
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 4096,
          temperature: 0.75,
        });

        const wordCount = result.response?.split(/\s+/).length || 0;

        return json({
          book_title,
          chapter_title,
          chapter_number: chapter_number || 1,
          author: AUTHOR_NAME,
          content: result.response,
          word_count: wordCount,
          model: MODELS.TEXT,
        }, corsHeaders);
      }

      // ─── Generate Cover Art ────────────────────
      if (path === '/api/ai/cover' && method === 'POST') {
        const body = await request.json();
        const { title, genre, style } = body;

        if (!title) {
          return json({ error: 'title is required' }, corsHeaders, 400);
        }

        const coverPrompt = `Professional book cover design for "${title}" by ${AUTHOR_NAME}. ` +
          `${genre ? `Genre: ${genre}.` : ''} ` +
          `${style || 'Modern, clean design with bold typography. Professional publishing quality.'} ` +
          `Publisher: ${PUBLISHER_NAME}. High quality, bookstore-ready cover art.`;

        const imageResult = await env.AI.run(MODELS.IMAGE, {
          prompt: coverPrompt,
          num_steps: 20,
        });

        // Return the image directly
        return new Response(imageResult, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'image/png',
            'X-Author': AUTHOR_NAME,
            'X-Book-Title': title,
            'X-Publisher': PUBLISHER_NAME,
          },
        });
      }

      // ─── Plagiarism Check (Embeddings) ─────────
      if (path === '/api/ai/plagiarism-check' && method === 'POST') {
        const body = await request.json();
        const { text, reference_texts } = body;

        if (!text) {
          return json({ error: 'text is required' }, corsHeaders, 400);
        }

        // Generate embedding for the text
        const textEmbedding = await env.AI.run(MODELS.EMBEDDINGS, {
          text: [text.substring(0, 512)], // Limit for embedding model
        });

        let similarities = [];
        if (reference_texts && reference_texts.length > 0) {
          // Compare against reference texts
          for (const ref of reference_texts.slice(0, 10)) {
            const refEmbedding = await env.AI.run(MODELS.EMBEDDINGS, {
              text: [ref.substring(0, 512)],
            });

            // Cosine similarity
            const sim = cosineSimilarity(
              textEmbedding.data[0],
              refEmbedding.data[0]
            );
            similarities.push({
              reference: ref.substring(0, 100) + '...',
              similarity: Math.round(sim * 1000) / 1000,
              is_similar: sim > 0.85,
            });
          }
        }

        const maxSimilarity = similarities.length > 0
          ? Math.max(...similarities.map(s => s.similarity))
          : 0;

        return json({
          text_length: text.length,
          word_count: text.split(/\s+/).length,
          embedding_dimensions: textEmbedding.data[0]?.length || 0,
          references_checked: similarities.length,
          max_similarity: maxSimilarity,
          is_original: maxSimilarity < 0.85,
          similarities,
          model: MODELS.EMBEDDINGS,
        }, corsHeaders);
      }

      // ─── SEO Keywords Generator ────────────────
      if (path === '/api/ai/seo-keywords' && method === 'POST') {
        const body = await request.json();
        const { title, genre, description } = body;

        if (!title) {
          return json({ error: 'title is required' }, corsHeaders, 400);
        }

        const result = await env.AI.run(MODELS.TEXT, {
          messages: [
            {
              role: 'system',
              content: 'You are an Amazon KDP SEO expert. Generate exactly 7 high-ranking ' +
                'keywords/phrases for Kindle books. Each keyword should be 2-4 words. ' +
                'Return ONLY the 7 keywords, one per line, no numbering.',
            },
            {
              role: 'user',
              content: `Generate 7 Amazon KDP keywords for: "${title}" ` +
                `${genre ? `(Genre: ${genre})` : ''} ` +
                `${description ? `Description: ${description.substring(0, 200)}` : ''}`,
            },
          ],
          max_tokens: 256,
          temperature: 0.6,
        });

        const keywords = result.response
          .split('\n')
          .map(k => k.trim())
          .filter(k => k.length > 0 && k.length < 50)
          .slice(0, 7);

        return json({
          title,
          genre,
          keywords,
          keyword_count: keywords.length,
          model: MODELS.TEXT,
        }, corsHeaders);
      }

      // ─── Book Description Generator ────────────
      if (path === '/api/ai/description' && method === 'POST') {
        const body = await request.json();
        const { title, genre, chapters, word_count } = body;

        if (!title) {
          return json({ error: 'title is required' }, corsHeaders, 400);
        }

        const result = await env.AI.run(MODELS.TEXT, {
          messages: [
            {
              role: 'system',
              content: `You are a professional book marketing copywriter for ${PUBLISHER_NAME}. ` +
                'Write compelling Amazon book descriptions that convert browsers to buyers. ' +
                'Use HTML formatting: <b>, <i>, <br>. Include a strong hook, benefits, and call to action.',
            },
            {
              role: 'user',
              content: `Write an Amazon KDP book description for: "${title}" by ${AUTHOR_NAME}. ` +
                `${genre ? `Genre: ${genre}.` : ''} ` +
                `${chapters ? `Chapters: ${chapters}.` : ''} ` +
                `${word_count ? `Length: ${word_count} words.` : ''} ` +
                `Publisher: ${PUBLISHER_NAME}.`,
            },
          ],
          max_tokens: 1024,
          temperature: 0.7,
        });

        return json({
          title,
          author: AUTHOR_NAME,
          publisher: PUBLISHER_NAME,
          description: result.response,
          model: MODELS.TEXT,
        }, corsHeaders);
      }

      // ─── Summarize Text ────────────────────────
      if (path === '/api/ai/summarize' && method === 'POST') {
        const body = await request.json();
        const { text, max_length } = body;

        if (!text) {
          return json({ error: 'text is required' }, corsHeaders, 400);
        }

        const result = await env.AI.run(MODELS.SUMMARIZE, {
          input_text: text.substring(0, 4096),
          max_length: max_length || 256,
        });

        return json({
          original_length: text.length,
          summary: result.summary,
          model: MODELS.SUMMARIZE,
        }, corsHeaders);
      }

      // ─── Translate Content ─────────────────────
      if (path === '/api/ai/translate' && method === 'POST') {
        const body = await request.json();
        const { text, source_lang, target_lang } = body;

        if (!text || !target_lang) {
          return json({ error: 'text and target_lang required' }, corsHeaders, 400);
        }

        const result = await env.AI.run(MODELS.TRANSLATE, {
          text: text.substring(0, 2048),
          source_lang: source_lang || 'en',
          target_lang: target_lang,
        });

        return json({
          source_lang: source_lang || 'en',
          target_lang,
          original: text.substring(0, 200),
          translation: result.translated_text,
          model: MODELS.TRANSLATE,
        }, corsHeaders);
      }

      // ─── Content Moderation ────────────────────
      if (path === '/api/ai/moderate' && method === 'POST') {
        const body = await request.json();
        const { text } = body;

        if (!text) {
          return json({ error: 'text is required' }, corsHeaders, 400);
        }

        const result = await env.AI.run(MODELS.TEXT, {
          messages: [
            {
              role: 'system',
              content: 'You are a content moderator for an Islamic publishing house. ' +
                'Analyze the given text and return a JSON object with: ' +
                '"is_appropriate": true/false, "concerns": [], "confidence": 0.0-1.0, ' +
                '"islamic_compliance": true/false. Check for: profanity, explicit content, ' +
                'hate speech, and content that contradicts Islamic principles.',
            },
            { role: 'user', content: `Analyze this text:\n\n${text.substring(0, 2048)}` },
          ],
          max_tokens: 256,
          temperature: 0.3,
        });

        return json({
          text_length: text.length,
          moderation: result.response,
          model: MODELS.TEXT,
          publisher: PUBLISHER_NAME,
        }, corsHeaders);
      }

      // ─── API Reference ─────────────────────────
      if (path === '/api') {
        return json({
          service: 'Oliver Gates Workers AI',
          version: '1.0.0',
          author: AUTHOR_NAME,
          publisher: PUBLISHER_NAME,
          endpoints: {
            'POST /api/ai/generate': 'Generate text content',
            'POST /api/ai/chapter': 'Generate a full book chapter',
            'POST /api/ai/cover': 'Generate cover art (returns PNG)',
            'POST /api/ai/plagiarism-check': 'Check text originality via embeddings',
            'POST /api/ai/seo-keywords': 'Generate 7 KDP SEO keywords',
            'POST /api/ai/description': 'Generate book description',
            'POST /api/ai/summarize': 'Summarize text',
            'POST /api/ai/translate': 'Translate between languages',
            'POST /api/ai/moderate': 'Content moderation (Islamic compliance)',
          },
        }, corsHeaders);
      }

      // ─── Proxy to Origin Publishing Engine ─────
      if (path.startsWith('/api/publishing/')) {
        const origin = env.ENGINE_ORIGIN || 'https://publishing-origin.darcloud.host';
        const originUrl = `${origin}${path}`;
        const originResp = await fetch(originUrl, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: method === 'POST' ? await request.text() : undefined,
        });
        const data = await originResp.json();
        return json(data, corsHeaders, originResp.status);
      }

      return json({ error: 'Not found', endpoints: '/api' }, corsHeaders, 404);

    } catch (err) {
      return json({
        error: err.message,
        service: 'oliver-gates-workers-ai',
      }, corsHeaders, 500);
    }
  },
};

// ─── Helpers ─────────────────────────────────────────

function json(data, corsHeaders = {}, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function landingPage(corsHeaders) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Oliver Gates AI — Powered by Workers AI</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: linear-gradient(135deg, #0a192f 0%, #1a1a2e 50%, #16213e 100%);
      color: #e0e0e0; min-height: 100vh;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 2.5em; background: linear-gradient(90deg, #00d4ff, #7b2ff7);
         -webkit-background-clip: text; -webkit-text-fill-color: transparent;
         margin-bottom: 10px; }
    .subtitle { color: #8892b0; font-size: 1.1em; margin-bottom: 30px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px;
             font-size: 0.8em; margin: 4px; }
    .badge-ai { background: #7b2ff740; color: #7b2ff7; border: 1px solid #7b2ff7; }
    .badge-live { background: #00ff8840; color: #00ff88; border: 1px solid #00ff88; }
    .models { margin: 30px 0; }
    .model-card { background: #1a1a2e; border: 1px solid #2a2a4e; border-radius: 12px;
                  padding: 20px; margin: 12px 0; }
    .model-card h3 { color: #00d4ff; margin-bottom: 8px; }
    .model-card p { color: #8892b0; font-size: 0.9em; }
    .endpoint { font-family: monospace; background: #0d1117; padding: 8px 16px;
                border-radius: 6px; margin: 6px 0; display: block; color: #00ff88; font-size: 0.85em; }
    .footer { margin-top: 40px; text-align: center; color: #475569; font-size: 0.85em; }
    .founder { color: #ffd700; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📚 Oliver Gates AI</h1>
    <p class="subtitle">AI-Powered Publishing Intelligence — Cloudflare Workers AI Edge</p>
    <span class="badge badge-ai">🧠 Workers AI</span>
    <span class="badge badge-live">● LIVE</span>
    <span class="badge badge-ai">Llama 3.1</span>
    <span class="badge badge-ai">Stable Diffusion XL</span>
    <span class="badge badge-ai">BGE Embeddings</span>

    <div class="models">
      <div class="model-card">
        <h3>📝 Content Generation</h3>
        <p>Full book chapters, descriptions, and marketing copy powered by Meta Llama 3.1 8B</p>
        <code class="endpoint">POST /api/ai/generate — Free-form content generation</code>
        <code class="endpoint">POST /api/ai/chapter — Complete book chapter writing</code>
        <code class="endpoint">POST /api/ai/description — KDP book descriptions</code>
      </div>
      <div class="model-card">
        <h3>🎨 Cover Art Generation</h3>
        <p>Professional book covers via Stable Diffusion XL — returns PNG images</p>
        <code class="endpoint">POST /api/ai/cover — Generate cover art</code>
      </div>
      <div class="model-card">
        <h3>🔍 Quality & Compliance</h3>
        <p>Plagiarism detection via BGE embeddings, content moderation for Islamic compliance</p>
        <code class="endpoint">POST /api/ai/plagiarism-check — Originality verification</code>
        <code class="endpoint">POST /api/ai/moderate — Islamic content compliance</code>
      </div>
      <div class="model-card">
        <h3>🌍 SEO & Localization</h3>
        <p>Amazon KDP keyword optimization and multi-language translation</p>
        <code class="endpoint">POST /api/ai/seo-keywords — 7 KDP-optimized keywords</code>
        <code class="endpoint">POST /api/ai/translate — Multi-language translation</code>
        <code class="endpoint">POST /api/ai/summarize — Text summarization</code>
      </div>
    </div>

    <div class="footer">
      <p>Author: <strong>Oliver Gates</strong> | Publisher: <strong>Dar Al-Nas Publishing™</strong></p>
      <p>KDP Account: A2xq3izrirvour | Founder Royalty: 30%</p>
      <p class="founder">© QuranChain™ | DarCloud™ | ${FOUNDER}</p>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html', ...corsHeaders },
  });
}
