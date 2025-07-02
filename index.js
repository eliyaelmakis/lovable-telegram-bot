import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// שואב את הטוקנים מהסביבה
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SERPAPI_KEY = process.env.SERPAPI_KEY;

app.post("/", async (req, res) => {
  const message = req.body.message;
  if (!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const query = message.text;

  try {
    const response = await axios.get(
      `https://serpapi.com/search.json`,
      {
        params: {
          engine: "google",
          q: `site:aliexpress.com ${query}`,
          api_key: SERPAPI_KEY
        }
      }
    );

    const results = response.data.organic_results || [];

    if (results.length === 0) {
      await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
        {
          chat_id: chatId,
          text: `No products found for "${query}". Try another keyword.`
        }
      );
      return res.sendStatus(200);
    }

    const topResults = results.slice(0, 3);
    let reply = `Here are some AliExpress results for "${query}":\\n\\n`;

    topResults.forEach(r => {
      reply += `👉 [${r.title}](${r.link})\\n\\n`;
    });

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: reply,
        parse_mode: "Markdown"
      }
    );

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: "Sorry, something went wrong."
      }
    );
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));