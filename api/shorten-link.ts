export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { longUrl, customAlias } = await req.json();

    if (!longUrl) {
      return new Response(JSON.stringify({ errormessage: 'URL is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let apiUrl = `https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`;
    if (customAlias) {
      apiUrl += `&shorturl=${encodeURIComponent(customAlias)}`;
    }

    const isGdResponse = await fetch(apiUrl);
    const data = await isGdResponse.json();

    return new Response(JSON.stringify(data), {
      status: isGdResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in shorten-link function:', error);
    return new Response(JSON.stringify({ errormessage: 'An internal server error occurred.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
