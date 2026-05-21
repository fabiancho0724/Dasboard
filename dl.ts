import * as https from 'https';

https.get('https://www.salariominimocolombia.net/historico/', {
  headers: {
    'User-Agent': 'Mozilla/5.0'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data+=chunk);
  res.on('end', () => console.log(data));
});
