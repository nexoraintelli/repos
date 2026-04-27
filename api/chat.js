export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({
      error: 'ANTHROPIC_API_KEY not set in environment variables'
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();

    const safeBody = {
      model: body.model || 'claude-3-5-haiku-latest',
      max_tokens: Math.min(body.max_tokens || 500, 700),
      messages: body.messages || [],
    };

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 22000);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(safeBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: corsHeaders,
    });

  } catch (err) {
    const isTimeout = err.name === 'AbortError';

    return new Response(JSON.stringify({
      error: isTimeout
        ? 'A IA demorou demais para responder. Tente novamente com menos imagens ou texto menor.'
        : err.message
    }), {
      status: isTimeout ? 408 : 500,
      headers: corsHeaders,
    });
  }
}
