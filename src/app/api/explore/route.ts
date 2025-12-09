import { NextResponse } from "next/server";
import OpenAI from "openai";

import { foodWasteData } from "@/data/foodWaste";

const datasetContext = foodWasteData.map((state) => ({
  name: state.name,
  code: state.code,
  fips: state.fips,
  annualTons: Number(state.annualTons.toFixed(2)),
  householdsImpacted: Math.round(state.householdsImpacted),
  population: state.population,
}));

const responseFormat = {
  type: "json_schema",
  json_schema: {
    name: "exploration_response",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "highlightedStates", "criteria"],
      properties: {
        summary: { type: "string", description: "Narrative summary of the insight." },
        criteria: {
          type: "string",
          description: "Plain-language description of the filter or comparison that was applied.",
        },
        highlightedStates: {
          type: "array",
          description: "States that satisfy the exploration request.",
          items: {
            type: "object",
            required: ["code", "reason"],
            additionalProperties: false,
            properties: {
              code: { type: "string", description: "Two-letter postal code." },
              reason: {
                type: "string",
                description: "Short explanation tying the state to the user's request.",
              },
            },
          },
        },
        suggestedNextQuestions: {
          type: "array",
          description: "Follow-up questions the user could explore.",
          items: { type: "string" },
        },
      },
    },
  },
} as const;

export async function POST(request: Request) {
  const { query } = (await request.json().catch(() => ({}))) as {
    query?: string;
  };

  if (!query || !query.trim()) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const topStates = [...datasetContext]
      .sort((a, b) => b.annualTons - a.annualTons)
      .slice(0, 3);

    return NextResponse.json({
      summary: "Offline mode: showing leading surplus states while AI is disabled.",
      criteria: `Sample insight for "${query.trim()}" (OpenAI API key not set).`,
      highlightedStates: topStates.map((state) => ({
        code: state.code,
        reason: `${state.name} ~${state.annualTons.toFixed(1)}M tons annually`,
      })),
      suggestedNextQuestions: [
        "Compare the Northeast to the West Coast",
        "Show states below 1.5M tons",
        "Which regions impact the most households?",
      ],
    });
  }

  const client = new OpenAI({ apiKey });

  const systemPrompt = `
You help people explore a dataset about U.S. surplus food headed to waste.
- Never fabricate numbers beyond the dataset provided below.
- Always cite state names and waste amounts (million tons) when relevant.
- Responses must be valid JSON that conforms to the exploration_response schema.
- Only include states that exist in the dataset context.

Dataset (million tons approximated):
${JSON.stringify(datasetContext)}
  `;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: responseFormat,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: query,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response content received from the AI model.");
    }

    const parsed = JSON.parse(content);

    return NextResponse.json({
      summary: parsed.summary,
      criteria: parsed.criteria,
      highlightedStates: parsed.highlightedStates ?? [],
      suggestedNextQuestions: parsed.suggestedNextQuestions ?? [],
    });
  } catch (error) {
    console.error("Exploration AI error:", error);
    return NextResponse.json({ error: "Unable to generate exploration insight." }, { status: 500 });
  }
}
