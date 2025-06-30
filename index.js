const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
const LOVABLE_API = process.env.LOVABLE_API;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

app.post('/webhook', async (req, res) => {
    const message = req.body.message;
    const chatId = message.chat.id;
    const userText = message.text;

    try {
        const lovableResponse = await axios.post(LOVABLE_API, {
            keyword: userText
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

