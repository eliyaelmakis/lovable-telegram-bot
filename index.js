// index.js
const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const app = express();

app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "YOUR_TELEGRAM_BOT_TOKEN";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || "YOUR_ACCESS_TOKEN";
const APP_KEY = process.env.APP_KEY || "YOUR_APP_KEY";
const APP_SECRET = process.env.APP_SECRET || "YOUR_APP_SECRET";

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

function generateAliSignature(params, appSecret) {
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== "sign")
    .sort();

  let baseString = "";
  sortedKeys.forEach((key) => {
    const val = params[key];
    if (val !== undefined && val !== "") {
      baseString += key + val;
    }
  });

  const toSign = appSecret + baseString + appSecret;

  const sign = crypto
    .createHmac("sha256", appSecret)
    .update(toSign, "utf8")
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

    const params = {
      method: "aliexpress.affiliate.product.query",
      app_key: APP_KEY,
      timestamp,
      sign_method: "sha256",
      access_token: ACCESS_TOKEN,
      keywords: query,
      page_size: 1,
      page_no: 1,
      uuid,
    };

    const sign = generateAliSignature(params, APP_SECRET);
    params.sign = sign;

    console.log("\u{1F50D} Query from user:", query);
    console.log("\u{1F9E9} Final request params:", params);

    const searchRes = await axios.post(
      "https://api-sg.aliexpress.com/rest",
      null,
      { params }
    );

    console.log("\u{1F50E} AliExpress Search Response:", searchRes.data);

    const results = searchRes.data.result?.products || [];
    if (results.length === 0) {
      await axios.post(TELEGRAM_API, {
        chat_id: chatId,
        text: `\u274C לא נמצאו תוצאות עבור "${query}".`,
      });
      return res.send("NO_RESULTS");
    }

    const product = results[0];
    const productTitle = product.product_title || "מוצר";
    const productUrl = product.product_detail_url || product.detail_url;

    await axios.post(TELEGRAM_API, {
      chat_id: chatId,
      text: `\u{1F50D} *${productTitle}*\n\n[מעבר למוצר](${productUrl})`,
      parse_mode: "Markdown",
    });

    res.send("OK");
  } catch (error) {
    console.error("\u274C שגיאה:", error.response?.data || error.message);
    await axios.post(TELEGRAM_API, {
      chat_id: chatId,
      text: "\u274C שגיאה בעיבוד הבקשה שלך. נסה שוב.",
    });
    res.send("ERROR");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`\u{1F680} Bot running on port ${PORT}`));
