const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// שואב את הטוקנים מהסביבה
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'YOUR_RAPIDAPI_KEY';

// 🔥 ➡️ הוסף route GET לבדיקה שהשרת עובד
app.get('/', (req, res) => {
    res.send('Server is running');
});

app.post('/webhook', async (req, res) => {
    const message = req.body.message;
    if (!message || !message.text) return res.sendStatus(200);

    const chatId = message.chat.id;
    const userText = message.text;

    try {
        // קריאה ל-RapidAPI לחיפוש מוצרים לפי מילות מפתח
        const options = {
            method: 'GET',
            url: 'https://aliexpress-datahub.p.rapidapi.com/item_search',
            params: { query: userText, page: '1' },
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        const products = response.data.result.resultList || [];

        let replyText = '';

        if (products.length === 0) {
            replyText = `No products found for "${userText}". Try another keyword.`;
        } else {
            // בנה תשובה עם 3 מוצרים ראשונים
            products.slice(0, 3).forEach((product, index) => {
                replyText += `${index + 1}. ${product.subject} - ${product.detailUrl}\n`;
            });
        }

        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: replyText
        });

        res.send('OK');
    } catch (error) {
        console.error(error);
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: "Sorry, something went wrong."
        });
        res.send('Error');
    }
});

// 🔥 ➡️ עדכן את ה-port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot is running on port ${PORT}`));
