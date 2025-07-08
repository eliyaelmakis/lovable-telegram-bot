const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// טוקנים מהסביבה
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const SERPAPI_KEY = process.env.SERPAPI_KEY || 'YOUR_SERPAPI_KEY';

// 🔥 ➡️ route GET לבדיקה
app.get('/', (req, res) => {
    res.send('Server is running');
});

app.post('/', async (req, res) => {
    const message = req.body.message;
    if (!message || !message.text) return res.sendStatus(200);

    const chatId = message.chat.id;
    const userText = message.text;

    try {
        // קריאה ל-SerpAPI לחיפוש בגוגל עם site:aliexpress.com
        const response = await axios.get('https://serpapi.com/search.json', {
            params: {
                engine: 'google',
                q: `site:aliexpress.com ${userText}`,
                api_key: SERPAPI_KEY
            }
        });

        const results = response.data.organic_results || [];
        let replyText = '';

        if (results.length === 0) {
            replyText = `No products found for "${userText}". Try another keyword.`;
        } else {
            // בנה תשובה עם 3 תוצאות ראשונות
            results.slice(0, 3).forEach((r, index) => {
                replyText += `${index + 1}. [${r.title}](${r.link})\n\n`;
            });
        }

        // שלח תשובה בטלגרם
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: replyText,
            parse_mode: "Markdown"
        });

        res.send('OK');
    } catch (error) {
        console.error("API ERROR:", error.response ? error.response.data : error.message);
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: "Sorry, something went wrong."
        });
        res.send('Error');
    }
});

// 🔥 ➡️ port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot is running on port ${PORT}`));
