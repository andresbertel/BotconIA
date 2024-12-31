const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
async function chat(prompt, text) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const formatPrompt = `\n\n` + prompt + `\n\nEl input del usuario es el siguiente: ` + text;
    const result = await model.generateContent(formatPrompt);
    const response = result.response;
    const answ = response.text();
    return answ;
}

module.exports = { chat };