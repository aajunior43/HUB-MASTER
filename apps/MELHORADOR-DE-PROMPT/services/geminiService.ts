import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PromptResponseSchema, OptimizationConfig } from "../types";

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.NUMBER,
      description: "A quality score from 0 to 100.",
    },
    critique: {
      type: Type.STRING,
      description: "Analysis of what is missing or weak (in Portuguese).",
    },
    changes: {
      type: Type.STRING,
      description: "Summary of changes made (in Portuguese).",
    },
    improvedPrompt: {
      type: Type.STRING,
      description: "The rewritten prompt (in Portuguese).",
    },
    usedTechnique: {
      type: Type.STRING,
      description: "The name of the specific prompt engineering framework or system applied.",
    },
    techniqueExplanation: {
      type: Type.STRING,
      description: "A brief educational definition of the technique used (in Portuguese). Explain WHAT it is.",
    },
    techniqueApplication: {
      type: Type.STRING,
      description: "A specific explanation of HOW this technique was applied to this specific prompt. Cite examples of added sections or structural changes.",
    },
  },
  required: ["score", "critique", "changes", "improvedPrompt", "usedTechnique", "techniqueExplanation", "techniqueApplication"],
};

export const improvePrompt = async (
  currentText: string,
  iteration: number,
  config: OptimizationConfig
): Promise<PromptResponseSchema> => {
  const model = "gemini-2.5-flash";

  // Framework instructions
  const frameworkInstructions = {
    'auto': "Analyze the input and SELECT THE BEST ENGINEERING FRAMEWORK automatically.",
    'costar': "FORCE the use of the **CO-STAR Framework** (Context, Objective, Style, Tone, Audience, Response). Structure the prompt explicitly with these labels.",
    'cot': "FORCE the use of **Chain-of-Thought (CoT)**. Instructions must require the model to think step-by-step or explain reasoning.",
    'few-shot': "FORCE the use of **Few-Shot Prompting**. You MUST invent realistic Input -> Output examples to guide the model.",
    'persona': "FORCE the use of **Persona/Role Prompting**. Define a highly specific expert persona.",
    'decomposition': "FORCE the use of **Task Decomposition**. Break the prompt into a numbered list of sub-tasks.",
    'race': "FORCE the use of the **RACE Framework** (Role, Action, Context, Expectation). Structure the prompt explicitly with these headers.",
    'ape': "FORCE the use of the **APE Framework** (Action, Purpose, Expectation). Keep it concise and action-oriented.",
    'rise': "FORCE the use of the **RISE Framework** (Role, Input, Steps, Expectation). Useful for complex processing tasks.",
    'tag': "FORCE the use of the **TAG Framework** (Task, Action, Goal). Use this for a direct, no-fluff structure.",
    'bab': "FORCE the use of the **BAB Framework** (Before, After, Bridge). Ideal for storytelling, marketing, or transformation tasks."
  };

  const chosenInstruction = frameworkInstructions[config.selectedTechnique];

  // Base System Instruction
  let systemInstruction = `
    You are an Expert Meta-Prompt Engineer.
    Your goal is to improve the user's prompt using advanced prompt engineering techniques.

    CRITICAL INSTRUCTION: ALL OUTPUT MUST BE IN PORTUGUESE (BRAZIL).
    The 'improvedPrompt', 'critique', 'changes', 'techniqueExplanation', and 'techniqueApplication' fields MUST be written in fluent, professional Portuguese.

    VARIABLE FORMATTING RULE (MANDATORY):
    - Identify any variables, placeholders, or data inputs required from the user.
    - LIST THEM ALL AT THE VERY END of the 'improvedPrompt'.
    - Use the format: "VARIABLE_NAME:" (Uppercase with colon, on a new line).
  `;

  let prompt = "";
  let temp = 0.7;

  if (config.mode === 'create' && iteration === 1) {
    // CREATE MODE LOGIC
    // Adjust creativity based on slider
    const creativityVal = config.creativityLevel || 50;
    let creativityInstruction = "";
    
    if (creativityVal < 30) {
      creativityInstruction = "STYLE: Strictly Professional, Concise, Technical, No Fluff. Direct instructions.";
      temp = 0.3;
    } else if (creativityVal > 70) {
      creativityInstruction = "STYLE: Highly Creative, Expansive, Descriptive, Engaging, Narrative-driven.";
      temp = 0.9;
    } else {
      creativityInstruction = "STYLE: Balanced, Professional yet Engaging, Clear structure.";
      temp = 0.7;
    }

    systemInstruction += `\nSTRATEGY: ${chosenInstruction}\n${creativityInstruction}`;
    prompt = `
      Task: CREATE a professional prompt based on this TOPIC/IDEA:
      "${currentText}"
      
      Ensure the prompt follows the requested style (Creativity Level: ${creativityVal}/100).
      ENSURE THE GENERATED PROMPT IS IN PORTUGUESE (PT-BR).
    `;

  } else if (config.mode === 'evolution') {
    // EVOLUTION MODE LOGIC
    const intensity = config.mutationIntensity || 'medium';
    let mutationInstruction = "";
    
    if (intensity === 'low') {
        mutationInstruction = "MUTATION INTENSITY: LOW. Make conservative improvements. Refine wording, fix logic, add minor constraints. Do not change the core structure drastically.";
        temp = 0.6;
    } else if (intensity === 'medium') {
        mutationInstruction = "MUTATION INTENSITY: MEDIUM. Introduce noticeable structural changes. Swap the framework if better. Add new sections (e.g., 'Examples', 'Anti-Hallucination').";
        temp = 0.8;
    } else {
        mutationInstruction = "MUTATION INTENSITY: HIGH (EXTREME). Be radical. Completely re-architecture the prompt. Change the Persona entirely. Add complex logic steps. Take risks.";
        temp = 1.0;
    }

    systemInstruction = `
      You are a GENETIC ALGORITHM ENGINE for Prompts.
      
      Your goal is to evolve the prompt through generations using biological concepts:
      
      1. **DIVERSITY (Internal Generation)**: 
         - Internally generate 2 distinct variants of the input prompt.
      
      2. **CROSSOVER (Recombination)**:
         - Merge the best elements of variants.
      
      3. **MUTATION (Random Evolution)**:
         - ${mutationInstruction}
         - Introduce a technique NOT present in the original.
      
      4. **SURVIVAL (Selection)**:
         - The final output MUST be the mutated survivor.

      OUTPUT INSTRUCTIONS (PT-BR):
      - 'usedTechnique': Name it "🧬 Mutação (${intensity === 'high' ? 'Extrema' : intensity === 'medium' ? 'Padrão' : 'Leve'}): [Nome da Técnica]".
      - 'changes': Describe the mutation added.
      - 'improvedPrompt': The final evolved organism.
      
      MANDATORY: PLACE INPUT VARIABLES AT THE END OF THE PROMPT.
    `;
    
    prompt = `
      GENETIC EVOLUTION CYCLE #${iteration}.
      
      Organism (Current Prompt):
      "${currentText}"
      
      EXECUTE: Generate Variants -> Crossover -> Mutate -> Select Survivor.
    `;

  } else {
    // IMPROVE MODE LOGIC (Standard)
    systemInstruction += `\nSTRATEGY: ${chosenInstruction}`;
    prompt = `
      Task: IMPROVE the following prompt iteratively.
      
      Current Prompt:
      "${currentText}"
      
      Analyze weaknesses. Apply the selected framework strategies.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: systemInstruction,
        temperature: temp,
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as PromptResponseSchema;
    }
    
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const testPrompt = async (
  promptTemplate: string,
  userInput: string
): Promise<string> => {
  const model = "gemini-2.5-flash";

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `${promptTemplate}\n\n${userInput}`,
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini API Error (Test):", error);
    throw error;
  }
};