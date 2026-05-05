
function classifyArticle(text) {
  const t = text.toLowerCase();

  if (t.includes("government") || t.includes("bill") || t.includes("court") || t.includes("constitution")) {
    return "Polity";
  }
  if (t.includes("economy") || t.includes("gdp") || t.includes("inflation") || t.includes("bank")) {
    return "Economy";
  }
  if (t.includes("china") || t.includes("usa") || t.includes("international") || t.includes("war")) {
    return "International Relations";
  }
  if (t.includes("climate") || t.includes("environment") || t.includes("pollution")) {
    return "Environment";
  }
  if (t.includes("technology") || t.includes("ai") || t.includes("space") || t.includes("science")) {
    return "Science & Tech";
  }

  return "General";
}


import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5001;

// 🔥 GROQ SETUP
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// =============================
// 🔥 SMART NEWS ROUTE
// =============================
app.get("/smart-news", async (req, res) => {
  try {
    const response = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q: "India OR economy OR government OR international",
        language: "en",
        sortBy: "publishedAt",
        pageSize: 5,
        apiKey: process.env.NEWS_API_KEY,
      },
    });

    console.log("API RESPONSE:", response.data);

    let articles = response.data.articles || [];

    // 🔥 FALLBACK IF EMPTY
    if (articles.length === 0) {
      console.log("⚠️ No articles from API, using fallback data");

      articles = [
        {
          title: "India Economic Growth Update",
          description:
            "India's GDP growth shows changing trends due to global factors.",
          url: "#",
        },
        {
          title: "Global Climate Policy Developments",
          description:
            "Countries are negotiating climate agreements to reduce emissions.",
          url: "#",
        },
        {
          title: "International Relations Shift",
          description:
            "Geopolitical tensions are affecting trade and diplomacy.",
          url: "#",
        },
      ];
    }

    // 🔥 LIMIT ARTICLES (avoid rate limit)
    articles = articles.slice(0, 3);

    const processed = [];

    for (let article of articles) {
      try {
        const aiResponse = await groq.chat.completions.create({
          model: "llama-3.1-8b-instant",

          messages: [
            {
              role: "system",
              content: `
You are a UPSC expert mentor.

Rules:
- Give structured answers
- Be concise and exam-oriented

Format STRICTLY:

1. Brief Answer  
2. Why it Matters  
3. UPSC Relevance (Prelims + Mains)  
4. 3 Key Points
              `,
            },
            {
              role: "user",
              content: `
Title: ${article.title}
Description: ${article.description}
              `,
            },
          ],
        });

        const analysis = aiResponse.choices[0].message.content;

const category = classifyArticle(article.title + " " + article.description);

processed.push({
  title: article.title,
  url: article.url,
  analysis: analysis,
  category: category,
});
      } catch (aiError) {
        console.error("AI ERROR:", aiError.message);

        processed.push({
          title: article.title,
          url: article.url,
          analysis: "AI analysis failed",
        });
      }
    }

    res.json(processed);
  } catch (error) {
    console.error("NEWS ERROR:", error.message);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// =============================
// 🔥 ASK AI ROUTE
// =============================
app.post("/ask-ai", async (req, res) => {
  try {
    const { content, question } = req.body;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",

      messages: [
        {
          role: "system",
          content: `
You are a UPSC mentor.

Answer clearly in structured format:
- Brief explanation
- Why important
- UPSC relevance
- Key points
          `,
        },
        {
          role: "user",
          content: `
Article:
${content}

Question:
${question}
          `,
        },
      ],
    });

    res.json({
      answer: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("ASK AI ERROR:", error.message);
    res.status(500).json({ error: "AI failed" });
  }
});

// =============================
// 🚀 START SERVER
// =============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
