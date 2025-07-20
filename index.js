const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const app = express();

app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "YOUR_TELEGRAM_BOT_TOKEN";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

const APP_KEY = process.env.APP_KEY || "516788";
const APP_SECRET = process.env.APP_SECRET || "WixDkQ3wFt24CJrIFKLXUYDh4vb7d20X";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || "YOUR_ACCESS_TOKEN";

// 🔐 יצירת חתימה
function generateSign(params) {
  const sortedKeys = Object.keys(params).sort();
  let baseString = APP_SECRET;
  for (const key of sortedKeys) {
    if (params[key]) baseString += key + params[key];
  }
  baseString += APP_SECRET;

  const hash = crypto
    .createHmac("sha256", APP_SECRET)
    .update(baseString, "utf8")
    .digest("hex")
    .toUpperCase();

  return hash;
}

// 📡 חיפוש מוצרים והחזרת תוצאות
app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  const chatId = message.chat.id;
  const query = message.text;

  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);

  const params = {
    app_key: APP_KEY,
    method: "aliexpress.affiliate.product.query",
    sign_method: "sha256",
    timestamp,
    access_token: ACCESS_TOKEN,
    keywords: query,
    page_size: "3",
  };

  const sign = generateSign(params);
  const finalParams = { ...params, sign };

  try {
    const { data } = await axios.post(
      "https://api-sg.aliexpress.com/rest",
      null,
      { params: finalParams }
    );

    if (data.error_response) {
      console.error("🔎 AliExpress Search Error:", data);
      await axios.post(TELEGRAM_API, {
        chat_id: chatId,
        text: `❌ שגיאה מה־API של AliExpress: ${data.error_response.msg}`,
      });
      return res.send("ERROR");
    }

    const results =
      data.aliexpress_affiliate_product_query_response?.resp_result?.result
        ?.products || [];

    if (results.length === 0) {
      await axios.post(TELEGRAM_API, {
        chat_id: chatId,
        text: `❌ לא נמצאו תוצאות עבור "${query}".`,
      });
      return res.send("NO_RESULTS");
    }

    let reply = `🔎 תוצאות עבור: *${query}*\n\n`;
    results.forEach((p, i) => {
      const link = p.product_detail_url;
      const title = p.product_title.replace(/\s+/g, " ").trim();
      reply += `${i + 1}. [${title}](${link})\n\n`;
    });

    await axios.post(TELEGRAM_API, {
      chat_id: chatId,
      text: reply,
      parse_mode: "Markdown",
    });

    res.send("OK");
  } catch (err) {
    console.error("❌ בקשה נכשלה:", err.message);
    await axios.post(TELEGRAM_API, {
      chat_id: chatId,
      text: "❌ שגיאה כללית. נסה שוב.",
    });
    res.send("ERROR");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 AliBot is running on port ${PORT}`));
