export const getStonksData = async () => {
  const response = await fetch('/.netlify/functions/fetch-data', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    // 'no-store' tells the browser not to use or update the cache, 
    // which solves the 304 issue immediately.
    cache: 'no-store', 
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
  }
  return response.json();
};