
// Vercel Edge Functions are fast, but Node.js runtime is needed for streaming response correctly.
export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: Request) {
  // Hanya izinkan metode POST
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

    // Ambil API key dari environment variable yang aman di Vercel
    const apiKey = process.env.PIXELCUT_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ message: 'API key is not configured on the server.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Kirim permintaan ke API Pixelcut dari server
    const response = await fetch('https://api.developer.pixelcut.ai/v1/remove-background', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_base64: image_base64,
        format: 'png',
      }),
    });

    // Jika Pixelcut mengembalikan error, teruskan error tersebut
    if (!response.ok) {
        const errorBody = await response.json();
        return new Response(JSON.stringify(errorBody), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Jika berhasil, stream gambar kembali ke frontend
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
      },
    });

  } catch (error) {
    console.error('Error in proxy function:', error);
    return new Response(JSON.stringify({ message: 'An internal server error occurred.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
