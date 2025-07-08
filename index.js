const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

const SERPAPI_KEY = process.env.SERPAPI_KEY || 'YOUR_SERPAPI_KEY';

const AFFILIATE_BASE = "https://rzekl.com/g/XXXXXXXXXXXXXXXX/?ulp=";
const SUBID = "&subid=alibot";

function createAffiliateLink(productUrl) {
    const encodedUrl = encodeURIComponent(productUrl);
    return AFFILIATE_BASE + encodedUrl + SUBID;
}

app.post('/webhook', async (req, res) => {
    const message = req.body.message;
    const chatId = message.chat.id;
    const query = message.text;

    try {
        // 🔎 קריאה ל-SERPAPI
        const serpResponse = await axios.get('https://serpapi.com/search.json', {
            params: {
                engine: "google",
                q: `site:aliexpress.com ${query}`,
                api_key: SERPAPI_KEY
            }
        });

        const results = serpResponse.data.organic_results || [];

        if (results.length === 0) {
            await axios.post(TELEGRAM_API, {
                chat_id: chatId,
                text: `לא נמצאו תוצאות עבור "${query}". נסה מילות מפתח אחרות.`
            });
            return res.send('OK');
        }

        // 🔗 המרת לינקים לאפיליאט
        let reply = `🔎 *תוצאות עבור:* ${query}\n\n`;
        results.slice(0, 3).forEach((r, i) => {
            const affiliateLink = createAffiliateLink(r.link);
            reply += `${i + 1}. [${r.title}](${affiliateLink})\n\n`;
        });

        // 📩 שליחת ההודעה למשתמש
        await axios.post(TELEGRAM_API, {
            chat_id: chatId,
            text: reply,
            parse_mode: "Markdown"
        });

        res.send('OK');

    } catch (error) {
        console.error(error);
        await axios.post(TELEGRAM_API, {
            chat_id: chatId,
            text: "❌ שגיאה בעיבוד הבקשה שלך. נסה שוב."
        });
        res.send('Error');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot is running on port ${PORT}`));
