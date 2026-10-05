// 📝 ARQUIVO DE EXEMPLO - Copie e personalize conforme necessário

export const promptExamples = {
  // Exemplo: Adicionar tema "Anime"
  animeSourceInstruction: `🎌 FONTE OBRIGATÓRIA: Citação DIRETA de anime famoso
• Use uma frase marcante de anime clássico ou moderno
• Pode ser nacional ou internacional
• Exemplos: "Acredite!" (Naruto), "Vou me tornar o Rei dos Piratas!" (One Piece)
• OBRIGATÓRIO: Mencione o anime entre parênteses`,

  // Exemplo: Tema específico para filmes brasileiros
  filmeBrasileiroInstruction: `🇧🇷 FONTE OBRIGATÓRIA: Citação DIRETA de filme brasileiro
• Use uma frase icônica do cinema nacional
• Exemplos: "Vai dar namoro" (Minha Mãe é uma Peça), "Eu não sou obrigado" (Cidade de Deus)
• OBRIGATÓRIO: Mencione o filme brasileiro entre parênteses`,

  // Exemplo: Prompt mais criativo
  creativeBasePrompt: `🌟 CATEGORIA: "{theme}" - SEJA EXTRAORDINÁRIO!

🎨 MISSÃO CRIATIVA: Surpreenda com uma citação ÚNICA que toque o coração sobre "{theme}".

{sourceInstruction}

✨ REGRAS DE OURO:
• SEJA EMOCIONALMENTE IMPACTANTE
• CONECTE com a alma humana
• NUNCA repita frases anteriores
• Máximo 70 caracteres na frase principal
{emojiInstruction}
{hashtagInstruction}
• Português brasileiro poético`,

  // Exemplo: Cores personalizadas
  customColorPalettes: `🎨 PALETA DE CORES PERSONALIZADA:
• Anime/Mangá: #ff6b6b + #ffffff + Poppins
• Livros/Literatura: #8b4513 + #f5f5dc + Crimson Text
• Jogos/Games: #9b59b6 + #ffffff + Montserrat
• Natureza/Meio Ambiente: #27ae60 + #ffffff + Inter
• Tecnologia/Inovação: #3498db + #ffffff + Poppins
• Arte/Criatividade: #e67e22 + #ffffff + Playfair Display`,

  // Exemplo: Formato mais elaborado
  elaborateFormat: `📝 FORMATO PREMIUM:
✨ "Citação inspiradora e única"
🎭 (Fonte - Autor/Obra)
💫 Reflexão adicional opcional
{hashtagsIfEnabled}

background: #HEXCODE
text: #HEXCODE
font: Nome da Fonte Premium`,

  // Exemplo: Instruções específicas por humor
  moodBasedInstructions: {
    motivacional: `💪 ENERGIA MÁXIMA: Frase que desperte força interior`,
    reflexivo: `🤔 PROFUNDIDADE: Citação que provoque reflexão profunda`,
    inspirador: `🌟 ELEVAÇÃO: Frase que eleve o espírito humano`,
    reconfortante: `🤗 ACOLHIMENTO: Citação que traga paz e conforto`
  }
};

// Exemplo de função personalizada para construir prompts
export function buildCustomPrompt(
  theme: string,
  mood: 'motivacional' | 'reflexivo' | 'inspirador' | 'reconfortante' = 'inspirador'
): string {
  return `🎯 TEMA: "${theme}" | HUMOR: ${mood.toUpperCase()}

${promptExamples.moodBasedInstructions[mood]}

🎨 Crie algo ÚNICO e MEMORÁVEL que ressoe com "${theme}"...`;
}

// Exemplo de configuração avançada
export const advancedConfig = {
  // Prompts específicos por horário
  timeBasedPrompts: {
    morning: "Crie uma citação energizante para começar o dia",
    afternoon: "Gere uma frase motivadora para o meio do dia",
    evening: "Desenvolva uma reflexão inspiradora para o fim do dia",
    night: "Elabore uma citação reconfortante para a noite"
  },

  // Prompts por estação do ano
  seasonalPrompts: {
    spring: "Incorpore elementos de renovação e crescimento",
    summer: "Adicione energia e vitalidade à citação",
    autumn: "Inclua sabedoria e reflexão sobre mudanças",
    winter: "Traga aconchego e introspecção à frase"
  },

  // Níveis de complexidade
  complexityLevels: {
    simple: "Use linguagem simples e direta",
    moderate: "Equilibre simplicidade com profundidade",
    complex: "Explore nuances filosóficas e poéticas"
  }
};