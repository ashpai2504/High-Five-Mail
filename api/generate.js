// Vercel serverless function: writes one High Five email with Google Gemini.
// The API key lives ONLY here (process.env.GEMINI_API_KEY) and is never sent to the browser.
//
// Set in Vercel: Project Settings -> Environment Variables
//   GEMINI_API_KEY = <your Google Gemini key>   (required)
//   GEMINI_MODEL   = gemini-2.5-flash-lite       (optional, this is the default)

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server is missing the GEMINI_API_KEY environment variable.' });
    return;
  }
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

  try {
    // Vercel parses JSON bodies automatically when Content-Type is application/json.
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { systemPrompt, recipient, comments } = body;

    if (!recipient || !comments) {
      res.status(400).json({ error: 'Both "recipient" and "comments" are required.' });
      return;
    }

    const userPrompt =
      `Recipient first name to address: ${recipient}\n\n` +
      `High Five comments written about them:\n"""${comments}"""\n\n` +
      `Write the email body now.`;

    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt || 'Write a warm, professional recognition email.' }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      let msg = `Gemini API error (HTTP ${r.status})`;
      try { const j = await r.json(); if (j.error && j.error.message) msg = j.error.message; } catch (_) {}
      res.status(r.status).json({ error: msg });
      return;
    }

    const data = await r.json();
    const parts = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    const text = parts.map(p => p.text || '').join('').trim();
    if (!text) {
      res.status(502).json({ error: 'The model returned an empty response.' });
      return;
    }

    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Unexpected server error.' });
  }
};
