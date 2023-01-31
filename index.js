require("dotenv").config();
const express = require("express");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");

const OpenAI = require("openai");
const { Configuration, OpenAIApi } = OpenAI;
const app = express();

const client = new Client({
  authStrategy: new LocalAuth(),
});
client.initialize();

console.log("init app", process.env.OPENAI_API_KEY);

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => {
  console.log("AUTHENTICATED");
});

client.on("auth_failure", (msg) => {
  // Fired if session restore was unsuccessful
  console.error("AUTHENTICATION FAILURE", msg);
});

client.on("ready", () => {
  console.log("Client is ready!");
});

client.on("message_create", async (msg) => {
  const chat = await msg.getChat();

  if (msg.body.startsWith("!ai")) {
    if (msg.body.split(" ")[0] === "!ai_help") {
      msg.reply(`*Lista de comandos*
-----------------------------------
- *!ai_help*: Como llegaste hasta aqui?
- *!ai*: Escribe una pregunta para OpenAI, ejemplo: _!ai Dame un nombre para un gato_. 
- *!ai_art*: Pide que te pinte algo, ejemplo: _!ai_art Dibuja un perro volador_.`);
      return;
    }

    if (msg.body.split(" ")[0] === "!ai") {
      let message = msg.body.replace("!ai ", "");

      try {
        chat.sendStateTyping();
        const completion = await openai.createCompletion({
          model: "text-davinci-003",
          prompt: message,
          temperature: 0.9,
          max_tokens: 500,
        });

        chat.clearState();
        chat.sendMessage(`OpenAI: ${completion.data.choices[0].text}`);
      } catch (error) {
        if (error.response) {
          console.error(error.response.status, error.response.data);
        } else {
          console.error(`Error with OpenAI API request: ${error.message}`);
          msg.reply("Hubo un error con OpenAI, intentalo nuevamente!");
        }
      }

      return;
    }

    if (msg.body.split(" ")[0] === "!ai_art") {
      let message = msg.body.replace("!ai_art ", "");

      try {
        chat.sendStateTyping();
        const image = await openai.createImage({
          prompt: message,
          n: 1,
          size: "256x256",
        });

        const media = await MessageMedia.fromUrl(image.data.data[0].url);

        chat.clearState();
        chat.sendMessage(media, { caption: "He aquí mi arte!" });
      } catch (error) {
        if (error.response) {
          console.error(error.response.status, error.response.data);
        } else {
          console.error(`Error with OpenAI API request: ${error.message}`);
          msg.reply("Hubo un error con OpenAI, intentalo nuevamente!");
        }
      }
    }
  }
});

app.get("/", function(req, res) {
  res.send("Hello World!");
});

app.listen(3000, function() {
  console.log("Example app listening on port 3000!");
});
