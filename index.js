const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

const APP_KEY = process.env.APP_KEY;
const APP_SECRET = process.env.APP_SECRET;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

// 🧩 חתימת בקשה לפי Business API
function generateAliBusinessSignature(params, appSecret, method) {
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== "sign")
    .sort();
  let baseString = "";
  for (const key of sortedKeys) {
    baseString += key + params[key];
  }
  baseString = method + baseString;

  return crypto
    .createHmac("sha256", appSecret)
    .update(baseString)
    .digest("hex")
    .toUpperCase();
}

app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  const chatId = message?.chat?.id;
  const query = message?.text;

  if (!chatId || !query) return res.send("INVALID_INPUT");

  try {
    const method = "aliexpress.affiliate.product.query";
    const timestamp = Date.now().toString();
    const uuid = uuidv4();

    const params = {
      method,
      app_key: APP_KEY,
      timestamp,
      sign_method: "sha256",
      access_token: ACCESS_TOKEN,
      keywords: query,
      page_size: 1,
      page_no: 1,
      uuid,
    };

    const sign = generateAliBusinessSignature(params, APP_SECRET, method);
    params.sign = sign;

    const response = await axios.get("https://api-sg.aliexpress.com/sync", {
      params,
    });

    const products = response.data.result?.products || [];
    if (products.length === 0) {
      await axios.post(TELEGRAM_API, {
        chat_id: chatId,
        text: `❌ לא נמצאו תוצאות עבור "${query}".`,
      });
      return res.send("NO_RESULTS");
    }

    const product = products[0];
    const title = product.product_title || "מוצר";
    const url = product.product_detail_url || product.detail_url;

    await axios.post(TELEGRAM_API, {
      chat_id: chatId,
      text: `🔎 *${title}*\n\n[מעבר למוצר](${url})`,
      parse_mode: "Markdown",
    });

    res.send("OK");
  } catch (err) {
    console.error("❌ שגיאה:", err.response?.data || err.message);
    await axios.post(TELEGRAM_API, {
      chat_id: chatId,
      text: "❌ שגיאה בעיבוד הבקשה שלך. נסה שוב.",
    });
    res.send("ERROR");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Bot running on port ${PORT}`));
