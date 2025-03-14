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

    const prompt = `Generate a detailed, engaging product description using the following information:

Product Details:
- Name: ${title}
- Manufacturer: ${companyName}
- Category: ${collection}
- Materials Used: ${materials.join(", ")}
- Country of Origin: ${country}
- Product Link: ${link}

Please write a compelling 3-4 sentence description that includes:
1. A strong opening statement about what makes this product unique or special
2. Specific details about the materials used and their benefits
3. Key features and practical applications
4. If relevant, mention the craftsmanship or manufacturing process
5. The product's place in its category (${collection})

Important:
- Be specific and avoid generic statements
- Highlight the quality of materials and craftsmanship
- Include actual details from the provided information
- Keep the tone professional but engaging
- Focus on tangible benefits and features

Format your response as a JSON object with a single "description" field.`;

    if (!process.env.OPENAI_API_KEY) {
      console.error("[OpenAI] API key not found");
      return "Product description unavailable.";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional product copywriter who specializes in creating detailed, engaging product descriptions that highlight unique features and quality materials."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
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