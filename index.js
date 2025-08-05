const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const APP_KEY = process.env.APP_KEY;
const APP_SECRET = process.env.APP_SECRET;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

// פונקציית חתימה לפי המדריך של AliExpress
function generateAliSignature(params, appSecret, apiPath) {
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== "sign" && params[k] !== undefined && params[k] !== "")
    .sort();

  let baseString = apiPath;
  for (const key of sortedKeys) {
    baseString += key + params[key];
  }

  const sign = crypto
    .createHmac("sha256", appSecret)
    .update(baseString, "utf8")
    .digest("hex")
    .toUpperCase();

  return sign;
}

app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  const chatId = message.chat.id;
  const query = message.text;

  try {
    const timestamp = Date.now().toString();
    const uuid = uuidv4();
    const method = "aliexpress.affiliate.product.query";

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
      format: "json",
    };

    const sign = generateAliSignature(params, APP_SECRET, method);
    params.sign = sign;

    console.log("🔍 Query from user:", query);
    console.log("🧩 Final request params:", params);

    const response = await axios.get("https://api-sg.aliexpress.com/sync", {
      params,
    });

    console.log("📦 AliExpress Response Full:", response.data);

    const results = response.data.result?.products || [];

    if (results.length === 0) {
      await axios.post(TELEGRAM_API, {
        chat_id: chatId,
        text: `❌ לא נמצאו תוצאות עבור "${query}".`,
      });
      return res.send("NO_RESULTS");
    }

    const product = results[0];
    const productTitle = product.product_title || "מוצר";
    const productUrl = product.product_detail_url || product.detail_url;

    await axios.post(TELEGRAM_API, {
      chat_id: chatId,
      text: `🔎 *${productTitle}*\n\n[מעבר למוצר](${productUrl})`,
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
app.listen(PORT, () => console.log(`🚀 Bot running on port ${PORT}`));
