// api/text-to-image.js

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.CLIPDROP_TEXT_TO_IMAGE_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const contentType = request.headers.get('Content-Type');
    const clipdropResponse = await fetch('https://clipdrop-api.co/text-to-image/v1', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        ...(contentType && { 'Content-Type': contentType }),
      },
      body: request.body,
    });
    
    if (!clipdropResponse.ok) {
        const errorBody = await clipdropResponse.json().catch(() => ({ error: 'Failed to parse error response from ClipDrop' }));
        return new Response(JSON.stringify(errorBody), {
            status: clipdropResponse.status,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    
    // Stream the image response directly back to the client
    return new Response(clipdropResponse.body, {
        status: 200,
        headers: {
            'Content-Type': clipdropResponse.headers.get('Content-Type') || 'application/octet-stream',
        },
    });

  } catch (error) {
    console.error('Proxy Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
