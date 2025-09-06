export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: Request) {
  // Vercel automatically decodes query parameters.
  const { searchParams } = new URL(req.url, `https://${req.headers.get('host')}`);
  const urlToFetch = searchParams.get('url');

  if (!urlToFetch) {
    return new Response('URL parameter is required.', { status: 400 });
  }

  try {
    // It's good practice to validate the URL a bit
    if (!urlToFetch.startsWith('https://photos.app.goo.gl/')) {
        return new Response('Invalid Google Photos URL provided.', { status: 400 });
    }

    const response = await fetch(urlToFetch, {
      headers: {
        // Mimic a browser user agent to reduce likelihood of being blocked
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });

    if (!response.ok) {
        const errorText = await response.text();
        return new Response(errorText || `Failed to fetch from Google Photos: ${response.statusText}`, { status: response.status });
    }

    const body = await response.text();

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Error in Google Photos proxy:', error);
    return new Response('An internal server error occurred while fetching the URL.', { status: 500 });
  }
}
