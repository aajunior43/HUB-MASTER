import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

if (!API_KEY) {
  console.warn('Gemini API key not found. Please add VITE_GEMINI_API_KEY to your environment variables.');
}

const genAI = new GoogleGenerativeAI(API_KEY);

export interface PromptGenerationOptions {
  category?: string;
  style?: string;
  complexity?: 'simple' | 'detailed' | 'expert';
  customInput?: string;
  type?: 'text' | 'image';
}

export async function generatePrompt(options: PromptGenerationOptions): Promise<string> {
  try {
    if (!API_KEY) {
      // Fallback para quando não há API key
      return generateFallbackPrompt(options);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const systemPrompt = `Você é um especialista em criação de prompts para LLMs (Large Language Models). Sua tarefa é criar prompts detalhados, profissionais e altamente eficazes para obtenção de respostas de alta qualidade de modelos de linguagem.

Diretrizes para criação de prompts para LLMs:
1. Seja claro e específico sobre o objetivo desejado
2. Forneça contexto relevante para a tarefa
3. Inclua exemplos ou formatos desejados quando apropriado
4. Defina restrições e limitações claras
5. Use linguagem direta e instruções precisas
6. Adapte o nível de complexidade solicitado
7. Mantenha foco na categoria especificada`;

    let userPrompt = '';
    
    if (options.customInput) {
      userPrompt = `Baseado na seguinte descrição: "${options.customInput}"`;
    } else {
      userPrompt = `Crie um prompt para ${options.type === 'text' ? 'tarefas de texto' : 'respostas gerais'}`;
    }

    if (options.category) {
      userPrompt += ` na categoria: ${options.category}`;
    }

    userPrompt += `. Nível de complexidade: ${options.complexity || 'detailed'}`;

    if (options.style) {
      userPrompt += `. Estilo preferido: ${options.style}`;
    }

    userPrompt += `\n\nGere um prompt em português, detalhado e profissional que produza respostas de alta qualidade de LLMs. O prompt deve ter entre 100-300 palavras e incluir instruções claras e específicas.`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userPrompt }
    ]);

    const response = await result.response;
    return response.text() || generateFallbackPrompt(options);

  } catch (error) {
    console.error('Erro ao gerar prompt com Gemini:', error);
    return generateFallbackPrompt(options);
  }
}

function generateFallbackPrompt(options: PromptGenerationOptions): string {
  const basePrompts = {
    writing: [
      "Você é um assistente especializado em escrita criativa. Siga estas instruções: 1) Analise o contexto fornecido, 2) Identifique o público-alvo e objetivo do texto, 3) Crie um conteúdo original e envolvente, 4) Mantenha a coerência e fluidez, 5) Use linguagem apropriada ao estilo solicitado. Produza um texto com qualidade profissional.",
      "Como especialista em redação, sua tarefa é: 1) Compreender profundamente o tema solicitado, 2) Estruturar logicamente o conteúdo, 3) Utilizar vocabulário rico e preciso, 4) Aplicar técnicas apropriadas ao gênero textual, 5) Revisar para garantir clareza e correção. Forneça uma resposta detalhada e bem elaborada.",
      "Você é um redator profissional. Siga este processo: 1) Interprete cuidadosamente as instruções, 2) Planeje a abordagem do conteúdo, 3) Desenvolva ideias com profundidade, 4) Empregue recursos linguísticos adequados, 5) Revise para assegurar qualidade. Entregue um texto claro, coeso e persuasivo."
    ],
    analysis: [
      "Como analista especializado, sua função é: 1) Examinar criticamente as informações fornecidas, 2) Identificar padrões e conexões relevantes, 3) Aplicar conhecimentos técnicos apropriados, 4) Formular conclusões embasadas, 5) Apresentar insights de forma clara. Forneça uma análise abrangente e fundamentada.",
      "Você é um especialista em análise de conteúdo. Siga estas etapas: 1) Compreenda o escopo da análise solicitada, 2) Separe informações relevantes das irrelevantes, 3) Utilize metodologias apropriadas ao tipo de análise, 4) Desenvolva raciocínios lógicos e consistentes, 5) Estruture suas descobertas de forma clara. Apresente uma análise profunda e bem fundamentada.",
      "Como consultor especializado, sua tarefa é: 1) Avaliar criticamente o problema ou questão apresentada, 2) Considerar múltiplas perspectivas e abordagens, 3) Aplicar conhecimentos específicos da área, 4) Formular recomendações embasadas, 5) Comunicar suas conclusões de forma eficaz. Produza uma análise completa e acionável."
    ],
    coding: [
      "Você é um engenheiro de software especializado. Siga estas diretrizes: 1) Compreenda exatamente o problema a ser resolvido, 2) Proponha uma solução técnica eficiente, 3) Explique claramente a lógica e estrutura do código, 4) Considere boas práticas de programação, 5) Forneça exemplos quando apropriado. Entregue uma solução técnica robusta e bem documentada.",
      "Como desenvolvedor experiente, sua tarefa é: 1) Analisar os requisitos técnicos especificados, 2) Arquitetar uma solução apropriada, 3) Implementar com atenção às melhores práticas, 4) Explicar claramente cada componente, 5) Antecipar possíveis problemas e otimizações. Forneça código limpo, funcional e bem comentado.",
      "Você é um programador especialista. Siga este processo: 1) Entenda profundamente o desafio proposto, 2) Escolha as tecnologias e abordagens mais adequadas, 3) Codifique com foco em eficiência e manutenibilidade, 4) Documente claramente a solução, 5) Sugira melhorias e alternativas. Apresente uma implementação técnica completa e profissional."
    ]
  };

  const category = options.category?.toLowerCase() || 'writing';
  const prompts = basePrompts[category as keyof typeof basePrompts] || basePrompts.writing;
  const basePrompt = prompts[Math.floor(Math.random() * prompts.length)];

  let finalPrompt = basePrompt;

  if (options.customInput) {
    finalPrompt = `${options.customInput}. ${basePrompt}`;
  }

  if (options.complexity === 'expert') {
    finalPrompt += " Produza uma resposta extremamente detalhada, profissional e de nível especialista, com profundidade técnica e insights avançados.";
  } else if (options.complexity === 'simple') {
    finalPrompt = basePrompt.split('.').slice(0, 2).join('.') + ". Forneça uma resposta clara e direta.";
  }

  return finalPrompt;
}

export async function generateMultiplePrompts(options: PromptGenerationOptions, count: number = 3): Promise<string[]> {
  const promises = Array.from({ length: count }, () => generatePrompt(options));
  const results = await Promise.allSettled(promises);
  
  return results.map((result, index) => 
    result.status === 'fulfilled' ? result.value : generateFallbackPrompt(options)
  );
}