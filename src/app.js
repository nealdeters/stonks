async function updateLeaderboard() {
  const participants = await fetch('./src/data/participants.json').then(r => r.json());
  const tickers = participants.map(p => p.ticker).join(',');

  // Fetch live prices from our serverless function
  const prices = await fetch(`/.netlify/functions/get-prices?tickers=${tickers}`)
    .then(r => r.json());

  const results = participants.map(p => {
    const currentPrice = prices.find(pr => pr.ticker === p.ticker).price;
    const marketValue = p.shares * currentPrice;
    const gainLoss = marketValue - (p.shares * p.cost);
    return { ...p, currentPrice, marketValue, gainLoss };
  });

  renderTable(results.sort((a, b) => b.gainLoss - a.gainLoss)); // Auto-sort by winner
}