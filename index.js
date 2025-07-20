const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const app = express();

app.use(express.json());

// 🔐 משתני סביבה
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "YOUR_TELEGRAM_BOT_TOKEN";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || "YOUR_ACCESS_TOKEN";
const APP_KEY = process.env.APP_KEY || "YOUR_APP_KEY";
const APP_SECRET = process.env.APP_SECRET || "YOUR_APP_SECRET";

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

// 🔏 פונקציה לחישוב חתימה
function generateSignature(params, secret) {
  const sortedKeys = Object.keys(params).sort();
  const baseString = sortedKeys.reduce(
    (str, key) => str + key + params[key],
    ""
  );
  const fullString = secret + baseString + secret;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(fullString)
    .digest("hex")
    .toUpperCase();

  return signature;
}

app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  const chatId = message.chat.id;
  const query = message.text;

  try {
    const timestamp = Date.now().toString();
    const uuid = crypto.randomUUID();

    const params = {
      keywords: query,
      app_key: APP_KEY,
      access_token: ACCESS_TOKEN,
      timestamp,
      uuid,
      sign_method: "sha256",
    };

    const sign = generateSignature(params, APP_SECRET);

    // 🔍 חיפוש באליאקספרס
    const searchRes = await axios.get(
      "https://api-sg.aliexpress.com/sync/search",
      {
        params: {
          ...params,
          sign,
          page_size: 1,
        },
      }
    );

    console.log("🔎 AliExpress Search Response:", searchRes.data);

    const product = searchRes.data.result_list?.[0];

    if (!product) {
      await axios.post(TELEGRAM_API, {
        chat_id: chatId,
        text: `❌ לא נמצאו תוצאות עבור "${query}".`,
      });
      return res.send("NO_RESULTS");
    }

    const productUrl = product.product_detail_url;
    const productTitle = product.product_title;

    // 🔗 לינק אפיליאט
    const affiliateRes = await axios.post(
      "https://api-sg.aliexpress.com/sync/generatePromotionLink",
      {
        access_token: ACCESS_TOKEN,
        app_key: APP_KEY,
        urls: [productUrl],
      }
    );

    const affiliateLink =
      affiliateRes.data.result?.[0]?.promotion_link || productUrl;

    // 📩 שליחה בטלגרם
    await axios.post(TELEGRAM_API, {
      chat_id: chatId,
      text: `🔎 *${productTitle}*\n\n[מעבר למוצר](${affiliateLink})`,
      parse_mode: "Markdown",
    });

    res.send("OK");
  } catch (error) {
    console.error("❌ שגיאה:", error.response?.data || error.message);
    await axios.post(TELEGRAM_API, {
      chat_id: chatId,
      text: "❌ שגיאה בעיבוד הבקשה שלך. נסה שוב.",
    });
    res.send("ERROR");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 AliExpress Bot is running on port ${PORT}`)
);
