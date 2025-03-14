import OpenAI from "openai";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

async function fetchProductPage(url: string): Promise<string> {
  try {
    console.log("[OpenAI] Fetching product page:", url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch product page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Enhanced content extraction
    const title = $('h1').first().text();
    const description = $('meta[name="description"]').attr('content') || '';
    const productInfo = $('div, p').filter((_, el) => {
      const text = $(el).text();
      return text.length > 50 && !text.includes('cookie') && !text.includes('privacy');
    }).slice(0, 5).text();

    const relevantContent = `${title}\n${description}\n${productInfo}`.trim();

    console.log("[OpenAI] Successfully extracted content:", relevantContent.substring(0, 200) + "...");
    return relevantContent.slice(0, 4000); // Limit tokens
  } catch (error: any) {
    console.error("[OpenAI] Error fetching product page:", error.message);
    return ""; // Return empty string on error
  }
}

export async function generateProductDescription(
  title: string,
  companyName: string,
  link: string,
  materials: string[],
  collection: string,
  country: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("[OpenAI] Missing API key");
    throw new Error("OpenAI API key is not configured");
  }

  try {
    console.log("[OpenAI] Generating description for:", { title, companyName, link });

    const pageContent = await fetchProductPage(link);
    if (!pageContent) {
      console.warn("[OpenAI] No content fetched from product page, proceeding with provided details only");
    }

    const prompt = `Generate a product description based on the following details:
- Product Name: "${title}"
- Company: "${companyName}"
- Materials: ${materials.join(', ')}
- Collection: "${collection}"
- Country: "${country}"

Additional context from product page:
${pageContent || 'No additional context available'}

Respond with a JSON object that has a "description" field containing a professional, engaging product description (2-3 paragraphs).
Focus on the unique value proposition, materials used, and how it fits into the collection.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional product copywriter known for creating compelling, accurate product descriptions that highlight unique features and benefits."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    console.log("[OpenAI] Received response:", response.choices[0]?.message?.content);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    try {
      const result = JSON.parse(content);
      if (!result.description) {
        throw new Error("Missing description in response");
      }
      return result.description;
    } catch (parseError: any) {
      console.error("[OpenAI] Failed to parse response:", parseError.message);
      throw new Error("Invalid response format from OpenAI");
    }

  } catch (error: any) {
    console.error("[OpenAI] Error generating description:", error);

    // Provide more specific error messages
    if (error.message.includes("API key")) {
      throw new Error("OpenAI API key is invalid or missing");
    } else if (error.message.includes("rate limit")) {
      throw new Error("OpenAI API rate limit exceeded. Please try again later.");
    } else {
      throw new Error(`Failed to generate description: ${error.message}`);
    }
  }
}