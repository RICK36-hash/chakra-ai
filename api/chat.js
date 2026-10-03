const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Models to try in order (fallback chain)
const MODELS = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.0-flash-lite"];

async function tryWithRetry(message, history, maxRetries = 2) {
  for (const modelName of MODELS) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const chat = model.startChat({
          history: Array.isArray(history) ? history : [],
        });

        const result = await chat.sendMessage(message);
        const text = result.response.text();
        console.log(`Success with model: ${modelName} (attempt ${attempt + 1})`);
        return text;
      } catch (error) {
        const status = error.status || error.httpStatusCode;
        console.warn(
          `Model ${modelName} attempt ${attempt + 1} failed: ${status} - ${error.message?.substring(0, 100)}`
        );

        // If it's a 503 (overloaded) or 429 (rate limit), retry after a delay
        if ((status === 503 || status === 429) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // If it's a non-retryable error (401, 400, 404), throw immediately
        if (status === 401 || status === 400 || status === 404) {
          throw error;
        }

        // If all retries exhausted for this model, try next model
        break;
      }
    }
  }

  throw new Error("All models are currently unavailable. Please try again in a moment.");
}

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

    const text = await tryWithRetry(message, history);

    return res.status(200).json({ reply: text });
  } catch (error) {
    console.error("Gemini API error:", error);

    // Handle specific API errors
    if (error.message?.includes("API_KEY") || error.status === 401) {
      return res.status(401).json({ error: "Invalid API key. Check your GEMINI_API_KEY." });
    }
    if (error.message?.includes("quota") || error.status === 429) {
      return res.status(429).json({ error: "API quota exceeded. Please try again later." });
    }
    if (error.status === 503) {
      return res.status(503).json({ error: "Gemini is experiencing high demand. Please try again in a few seconds." });
    }

    return res.status(500).json({ error: error.message || "Something went wrong. Please try again." });
  }
};
