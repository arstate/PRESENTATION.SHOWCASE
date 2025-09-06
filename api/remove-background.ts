
// Vercel Edge Functions are fast, but Node.js runtime is needed for streaming response correctly.
// We explicitly set the body parser size limit, although we can't exceed the 4.5MB Hobby plan limit.
export const config = {
  runtime: 'nodejs',
  api: {
    bodyParser: {
      sizeLimit: '4.5mb',
    },
  },
};

export default async function handler(req: Request) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { image_base64 } = await req.json();

    if (!image_base64) {
      return new Response(JSON.stringify({ message: 'Image data is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the API key from secure environment variables
    const apiKey = process.env.PIXELCUT_API_KEY;
    if (!apiKey) {
        console.error("PIXELCUT_API_KEY environment variable is not set on the server.");
        return new Response(JSON.stringify({ message: 'API key is not configured on the server.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Send the request to Pixelcut from the server, asking for a JSON response
    const pixelcutResponse = await fetch('https://api.developer.pixelcut.ai/v1/remove-background', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json', // Important: We want a JSON object with a result_url
      },
      body: JSON.stringify({
        image_base64: image_base64,
        format: 'png',
      }),
    });

    const responseData = await pixelcutResponse.json();

    // If Pixelcut returned an error, forward that error to the client
    if (!pixelcutResponse.ok) {
        return new Response(JSON.stringify(responseData), {
            status: pixelcutResponse.status,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // If successful, send the JSON containing the result_url back to the frontend
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error: any) {
    console.error('Error in proxy function:', error);
    // Handle cases like the request body not being valid JSON
    const errorMessage = error.type === 'invalid-json' 
      ? 'Invalid image data received from client.' 
      : 'An internal server error occurred.';
      
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
