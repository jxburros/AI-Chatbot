import express from 'express';
import { AIHandler, envKeySource } from '@jxburros/ai-nugget';

const app = express();
const port = Number(process.env.PORT || 3031);
const handler = new AIHandler({ keySource: envKeySource() });
const connection = {
  id: 'prompt-mirror',
  provider: process.env.AI_PROVIDER || 'openai',
  keyRef: { kind: 'env', name: process.env.AI_KEY_ENV || 'OPENAI_API_KEY' },
};
const model = process.env.AI_MODEL || 'gpt-4o-mini';

app.use(express.json({ limit: '24kb' }));
app.use(express.static(new URL('./public', import.meta.url).pathname));

function parseJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('The model returned an unexpected format.');
  return JSON.parse(match[0]);
}

app.post('/api/mirror', async (req, res) => {
  const note = String(req.body?.note || '').trim().slice(0, 2000);
  if (!note) return res.status(400).json({ error: 'Write a thought first.' });
  try {
    const result = await handler.chat(connection, {
      model,
      temperature: 0.7,
      messages: [
        { role: 'system', content: 'You are Prompt Mirror, a warm, practical thinking partner. Do not diagnose or claim certainty. Return ONLY JSON with string fields: reflection, reframe, tinyStep, question. Keep each under 55 words.' },
        { role: 'user', content: note },
      ],
    });
    res.json(parseJson(result.text));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Mirror unavailable. Check your API key and model settings.' });
  }
});

app.listen(port, () => console.log(`Prompt Mirror running at http://localhost:${port}`));
