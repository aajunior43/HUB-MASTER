import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini Client
  // Fails fast if API key is improperly configured
  let ai: GoogleGenAI;
  
  // Try to grab API key from environment, checking both standard names
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

  try {
    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
      console.warn("Invalid or missing API key. Please check your AI Studio settings.");
    }
    ai = new GoogleGenAI({ apiKey: apiKey });
  } catch (err) {
    console.warn("Could not initialize GoogleGenAI:", err);
  }

  // API Route
  app.post("/api/generate", async (req, res) => {
    try {
      const { theme } = req.body;
      if (!theme) {
        return res.status(400).json({ error: "Theme is required" });
      }

      if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY' || apiKey.length < 10) {
        return res.status(401).json({ 
          error: "API Key não configurada. Por favor, adicione sua chave do Gemini nas configurações (Settings -> Secrets)."
        });
      }

      const prompt = `ATENÇÃO: VOCÊ É UM CURADOR DE CITAÇÕES HISTÓRICAS E VERIFICÁVEIS.
    
    PROTOCOLO DE VERACIDADE (ESTRITO):
    1. É TERMINANTEMENTE PROIBIDO inventar, criar ou alucinar frases.
    2. Use APENAS citações que existam no mundo real e sejam atribuídas corretamente a seus autores originais.
    3. Se você tiver 1% de dúvida sobre a autoria, DESCARTE a frase.
    4. Priorize frases famosas e documentadas de filósofos, escritores, artistas e líderes históricos.
    5. NÃO gere frases genéricas de "sabedoria popular" e atribua a alguém aleatório. A autoria deve ser exata.

    TAREFA:
    Analise o tema: "${theme}". Crie 3 opções de design para Status com citações REAIS.

    Para cada opção:
    1. Defina um TOM (ex: Sarcástico, Estoico, Poético, Realista).
    2. Selecione uma CITAÇÃO REAL (máx 130 caracteres incluindo autor) + NOME DO AUTOR.
       - Traduza para PT-BR mantendo o sentido original.
       - Formato Obrigatório: Texto da citação, QUEBRA DE LINHA (\\n), Travessão e Autor.
       - Exemplo no JSON: "Penso, logo existo.\\n— Descartes"
       - OBRIGATÓRIO: O texto final DEVE conter "\\n— " antes do autor.
    3. Escolha o design brutalista (fonte, cor, alinhamento).
    
    Paletas Disponíveis: "P&B", "DARK", "ACID", "BLUE", "WARNING", "ERROR", "MATRIX", "VAPOR", "BLOOD", "CEMENT", "CYBER", "LAVENDER", "TOXIC".
    Fontes Disponíveis: "font-sans" (Grotesk), "font-mono" (Código), "font-display" (Pesada), "font-serif" (Editorial).
    
    Regras de Estilo:
    - Tons agressivos/fortes: Cores WARNING/ERROR/ACID, Fonte Display.
    - Tons sóbrios/tristes: Cores P&B/DARK, Fonte Mono/Sans.
    - Ajuste fontSize (50 a 100) para preencher bem o card.
    
    Retorne apenas JSON válido.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              variants: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tone: { type: Type.STRING, description: "O tom da citação" },
                    text: { type: Type.STRING, description: "A citação com \\n e autor." },
                    font: { type: Type.STRING, enum: ["font-sans", "font-mono", "font-display", "font-serif"] },
                    paletteName: { type: Type.STRING, enum: ["P&B", "DARK", "ACID", "BLUE", "WARNING", "ERROR", "MATRIX", "VAPOR", "BLOOD", "CEMENT", "CYBER", "LAVENDER", "TOXIC"] },
                    alignment: { type: Type.STRING, enum: ["text-left", "text-center", "text-right"] },
                    fontSize: { type: Type.INTEGER },
                    hasNoise: { type: Type.BOOLEAN },
                    uppercase: { type: Type.BOOLEAN }
                  }
                }
              }
            }
          }
        }
      });

      const json = JSON.parse(response.text || '{"variants": []}');
      
      const mappedVariants = json.variants.map((item: any, index: number) => ({
        id: `gen-${Date.now()}-${index}`,
        tone: item.tone || 'AUTO',
        text: item.text,
        font: item.font,
        paletteName: item.paletteName,
        alignment: item.alignment,
        fontSize: item.fontSize,
        hasNoise: item.hasNoise,
        uppercase: item.uppercase
      }));

      res.json(mappedVariants);
    } catch (error: any) {
      console.error("Gemini API Error in Server:", error);
      res.status(500).json({ error: "Erro ao comunicar com a IA", details: error.message || String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For React router / SPA
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
