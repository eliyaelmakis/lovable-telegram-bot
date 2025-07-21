const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const app = express();

app.use(express.json());

// 🔐 משתני סביבה
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "YOUR_TELEGRAM_BOT_TOKEN";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

const ACCESS_TOKEN = process.env.ACCESS_TOKEN || "YOUR_ACCESS_TOKEN";
const APP_KEY = process.env.APP_KEY || "YOUR_APP_KEY";
const APP_SECRET = process.env.APP_SECRET || "YOUR_APP_SECRET";

// 🔏 פונקציה לחתימה לפי אלגוריתם של AliExpress
function generateSignature(params, appSecret) {
  const sortedKeys = Object.keys(params).sort();
  const baseString = sortedKeys.reduce((acc, key) => {
    return acc + key + params[key];
  }, appSecret);

  const sign = crypto
    .createHmac("sha256", appSecret)
    .update(baseString + appSecret)
    .digest("hex")
    .toUpperCase();

  return sign;
}

app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  const chatId = message.chat.id;
  const query = message.text;

  try {
    // 🔧 בניית פרמטרים לחיפוש מוצר
    const timestamp = Date.now();
    const uuid = uuidv4();

    const params = {
      method: "aliexpress.affiliate.product.query",
      app_key: APP_KEY,
      timestamp: timestamp.toString(),
      sign_method: "sha256",
      access_token: ACCESS_TOKEN,
      keywords: query,
      page_size: 1,
      page_no: 1,
      uuid,
    };

    const sign = generateSignature(params, APP_SECRET);
    const finalParams = { ...params, sign };

    console.log("🔍 Query from user:", query);
    console.log("🧩 Final request params:", finalParams);

    const searchRes = await axios.get("https://api-sg.aliexpress.com/rest", {
      params: finalParams,
    });

    const data = searchRes.data;

    console.log(
      "🔎 AliExpress Search Response:",
      JSON.stringify(data, null, 2)
    );

    // 🔁 טיפול בתוצאה
    const product = data.resp_result?.result?.products?.[0];

    if (!product) {
      await axios.post(TELEGRAM_API, {
        chat_id: chatId,
        text: `❌ לא נמצאו תוצאות עבור "${query}".`,
      });
      return res.send("NO_RESULTS");
    }

    const title = product.product_title;
    const url = product.promotion_link || product.product_detail_url;

    await axios.post(TELEGRAM_API, {
      chat_id: chatId,
      text: `🔎 *${title}*\n\n[מעבר למוצר](${url})`,
      parse_mode: "Markdown",
    });

    res.send("OK");
  } catch (error) {
    console.error("❌ Error occurred:", error.response?.data || error.message);
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
