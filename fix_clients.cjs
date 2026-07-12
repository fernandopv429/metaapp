const fs = require('fs');
let code = fs.readFileSync('src/components/ClientsView.tsx', 'utf-8');

if (!code.includes('destinationWebhookUrl')) {
    console.log("Needs updating");
}
