const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Build the chat with history for multi-turn memory
    // history format: [{ role: "user"|"model", parts: [{ text: "..." }] }]
    const chat = model.startChat({
      history: Array.isArray(history) ? history : [],
    });

    // Send the new message
    const result = await chat.sendMessage(message);
    const response = result.response;
    const text = response.text();

    return res.status(200).json({ reply: text });
  } catch (error) {
    console.error("Gemini API error:", error);

    // Handle specific API errors
    if (error.message?.includes("API_KEY")) {
      return res.status(401).json({ error: "Invalid API key. Check your GEMINI_API_KEY." });
    }
    if (error.message?.includes("quota")) {
      return res.status(429).json({ error: "API quota exceeded. Please try again later." });
    }

    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
