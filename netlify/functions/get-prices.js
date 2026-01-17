const axios = require('axios');

exports.handler = async (event) => {
  const API_KEY = process.env.FINNHUB_KEY; // Hidden in Netlify settings
  const tickers = event.queryStringParameters.tickers.split(',');

  try {
    const requests = tickers.map(t => 
      axios.get(`https://finnhub.io/api/v1/quote?symbol=${t}&token=${API_KEY}`)
    );
    const responses = await Promise.all(requests);
    const data = responses.map((r, i) => ({ ticker: tickers[i], price: r.data.c }));

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};