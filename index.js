const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'YOUR_RAPIDAPI_KEY';

app.post('/webhook', async (req, res) => {
    const message = req.body.message;
    const chatId = message.chat.id;
    const userText = message.text;

    try {
        // ����� �-RapidAPI ������ ������ ��� ����� ����
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
            // ��� ����� �� 3 ������ �������
            products.slice(0, 3).forEach((product, index) => {
                replyText += `${index + 1}. ${product.subject} - ${product.detailUrl}\n`;
            });
        }

        await axios.post(TELEGRAM_API, {
            chat_id: chatId,
            text: replyText
        });

        res.send('OK');
    } catch (error) {
        console.error(error);
        res.send('Error');
    }
});

app.listen(3000, () => console.log('Bot is running on port 3000'));


