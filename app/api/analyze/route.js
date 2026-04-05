export const runtime = 'edge';

export async function POST(req) {
  const { query } = await req.json();
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: `You are an OSINT analyst in CloudSINT, made by S. Structure output with ALL CAPS section headers: SUMMARY, DIGITAL FOOTPRINT, RECONNAISSANCE VECTORS, RISK ASSESSMENT, RECOMMENDED NEXT STEPS, LEGAL NOTICE. Plain text only, no markdown, no bullets.`,
      messages: [{ role: 'user', content: query }],
    }),
  });

  const data = await resp.json();
  const text = (data.content || []).map(c => c.text || '').join('');
  return new Response(JSON.stringify({ result: text }), { headers: { 'Content-Type': 'application/json' } });
}
