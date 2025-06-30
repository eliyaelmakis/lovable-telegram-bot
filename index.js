const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 8077997012: AAGZ20EbDT2aUxO_7DZPjJzwTBXxU5Yy20E;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

const LOVABLE_API = process.env.LOVABLE_API || https://jscofgyorxlueihjzibd.supabase.co;
const SUPABASE_KEY = process.env.SUPABASE_KEY || eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzY29mZ3lvcnhsdWVpaGp6aWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMjk0NDcsImV4cCI6MjA2NjgwNTQ0N30.zhs07V77lgYwDm2OjNqWE1B3ndpGRNPeS4edWgW9HrM;

app.post('/webhook', async (req, res) => {
    const message = req.body.message;
    const chatId = message.chat.id;
    const userText = message.text;

    try {
        const lovableResponse = await axios.post(LOVABLE_API, {
            prompt: `Find me AliExpress links for: ${userText}`
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        const aiReply = lovableResponse.data.reply || 'No results found.';

        await axios.post(TELEGRAM_API, {
            chat_id: chatId,
            text: aiReply
        });

        res.send('OK');
    } catch (error) {
        console.error(error);
        res.send('Error');
    }
});

app.listen(3000, () => console.log('Bot is running on port 3000'));

