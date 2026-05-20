import fetch from "node-fetch";

export class LLMClient {
  constructor(private apiKey: string) {}

  async chat(messages: any[]) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen-2.5-72b-instruct",
        messages,
        temperature: 0.2,
      }),
    });

    const json: any = await res.json();

    if (!res.ok) {
      console.error("LLM ERROR RESPONSE:", json);
      throw new Error("LLM request failed");
    }

    if (!json.choices?.length) {
      console.error("BAD LLM RESPONSE SHAPE:", json);
      throw new Error("Missing choices in LLM response");
    }

    return json.choices[0].message;
  }
}
