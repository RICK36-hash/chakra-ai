const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.0-flash-lite"];

async function tryWithRetry(message, history, maxRetries = 2, config = {}) {
  const { requestedModel, temperature, systemInstruction } = config;
  
  // Prefer requested model, then fall back to standard list
  const modelsToTry = requestedModel && requestedModel !== "auto" 
    ? [requestedModel, ...FALLBACK_MODELS.filter(m => m !== requestedModel)]
    : FALLBACK_MODELS;

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const modelOpts = { model: modelName };
        if (systemInstruction) {
          modelOpts.systemInstruction = systemInstruction;
        }

        const model = genAI.getGenerativeModel(modelOpts);
        
        const generationConfig = {};
        if (temperature !== undefined) generationConfig.temperature = parseFloat(temperature);

        const chat = model.startChat({
          history: Array.isArray(history) ? history : [],
          generationConfig
        });

        const result = await chat.sendMessage(message);
        return result.response.text();
      } catch (error) {
        const status = error.status || error.httpStatusCode;
        console.warn(`Model ${modelName} attempt ${attempt + 1} failed: ${status} - ${error.message?.substring(0, 100)}`);

        if ((status === 503 || status === 429) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (status === 401 || status === 400 || status === 404) throw error;
        break; // Exhausted retries for this model, move to next fallback
      }
    }
  }

  throw new Error("All models are currently unavailable. Please try again in a moment.");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message, history, model, temperature, systemInstruction } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const config = { requestedModel: model, temperature, systemInstruction };
    const text = await tryWithRetry(message, history, 2, config);

    return res.status(200).json({ reply: text });
  } catch (error) {
    console.error("Gemini API error:", error);
    if (error.message?.includes("API_KEY") || error.status === 401) {
      return res.status(401).json({ error: "Invalid API key. Check your GEMINI_API_KEY." });
    }
    if (error.message?.includes("quota") || error.status === 429) {
      return res.status(429).json({ error: "API quota exceeded. Please try again later." });
    }
    if (error.status === 503) {
      return res.status(503).json({ error: "Gemini is experiencing high demand. Please try again." });
    }
    return res.status(500).json({ error: error.message || "Something went wrong." });
  }
};
