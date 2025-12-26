const express = require('express');
const app = express();
const os = require('os');
const fs = require('fs');
const path = require('path');

// --- Installation nécessaire : npm install express ---

const LOG_FILE = path.join(__dirname, 'app-logs.txt');
let logs = [];

app.use(express.json({ limit: '10mb' })); // Augmenter la limite pour les logs volumineux

// Route pour recevoir les logs
app.post('/log', (req, res) => {
  const log = {
    ...req.body,
    timestamp: new Date().toLocaleTimeString('fr-FR', { hour12: false })
  };

  console.log(`📝 ${log.level.toUpperCase()}: ${log.message}`);

  // Sauvegarder dans un fichier
  const dataString = log.data && Object.keys(log.data).length > 0 ? ` ${JSON.stringify(log.data)}` : '';
  fs.appendFileSync(LOG_FILE,
    `${log.timestamp} - ${log.level.toUpperCase()}: ${log.message}${dataString}\n`
  );

  logs.unshift(log); // Ajouter au début
  if (logs.length > 200) logs = logs.slice(0, 200); // Garder 200 logs max

  res.status(200).send('OK');
});

// Page web pour voir les logs
app.get('/', (req, res) => {
  let html = `
    <html>
      <head>
        <title>📱 Logs de l'application</title>
        <meta http-equiv="refresh" content="3">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b; }
          h1 { color: #0f172a; }
          .log { margin: 5px 0; padding: 12px; border-radius: 8px; background-color: #fff; border: 1px solid #e2e8f0; }
          .log-info { border-left: 4px solid #3b82f6; }
          .log-warning { border-left: 4px solid #f59e0b; }
          .log-error { border-left: 4px solid #ef4444; }
          .timestamp { color: #64748b; font-weight: 600; }
          .level { font-weight: bold; text-transform: uppercase; }
          .level-info { color: #3b82f6; }
          .level-warning { color: #f59e0b; }
          .level-error { color: #ef4444; }
          pre { background-color: #f1f5f9; padding: 8px; border-radius: 4px; white-space: pre-wrap; word-break: break-all; }
        </style>
      </head>
      <body>
        <h1>📱 Logs de l'application</h1>
  `;

  logs.forEach(log => {
    const dataString = log.data && Object.keys(log.data).length > 0 ? `<pre>${JSON.stringify(log.data, null, 2)}</pre>` : '';
    html += `
      <div class="log log-${log.level}">
        <span class="timestamp">${log.timestamp}</span>
        <span class="level level-${log.level}">[${log.level}]</span>
        ${log.message}
        ${dataString}
      </div>
    `;
  });

  html += '</body></html>';
  res.send(html);
});

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Ignorer les adresses internes (ex: 127.0.0.1) et non-IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1'; // Fallback si aucune IP n'est trouvée
}

// Démarrer le serveur
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIpAddress();
  console.log(`\n🚀 Serveur de logs prêt !`);
  console.log(`   Ouvrez cette page dans votre navigateur (PC ou téléphone) :`);
  console.log(`   ➡️  http://${ip}:${PORT}`);
  console.log(`   (Votre adresse IP locale est ${ip})`);
});
