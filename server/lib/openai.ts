import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateProductDescription(
  title: string,
  companyName: string,
  link: string,
  materials: string[],
  collection: string,
  country: string
): Promise<string> {
  try {
    console.log("[OpenAI] Generating description for:", { title, companyName });

    const prompt = `Generate a concise, accurate description for this product with the following information:
Product: ${title}
Company: ${companyName}
Materials: ${materials.join(", ")}
Collection: ${collection}
Country: ${country}
Product Link: ${link}

Please provide a concise 2-3 sentence description that highlights:
1. What the product is and its main purpose
2. Key materials and craftsmanship
3. Any notable features or quality aspects

Format your response as a JSON object with a single "description" field.`;

    if (!process.env.OPENAI_API_KEY) {
      console.error("[OpenAI] API key not found");
      return "Product description unavailable.";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    console.log("[OpenAI] Received response:", response.choices[0].message.content);

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.description || "Description generation failed.";
  } catch (error: any) {
    console.error("[OpenAI] Error generating description:", error);
    // Return a default message instead of throwing
    return "A high-quality product crafted with attention to detail and premium materials.";
  }
}