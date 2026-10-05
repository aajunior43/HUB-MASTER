export interface PromptConfig {
  basePrompt: string;
  sourceInstructions: {
    filme: string;
    series: string;
    musica: string;
    default: string;
  };
  colorPalettes: string;
  examples: string;
  formatInstructions: string;
}

export const promptConfig: PromptConfig = {
  basePrompt: `Crie uma frase inspiradora sobre "{theme}".

REquISITOS:
- Seja original e motivacional
- Use português brasileiro
- Máximo 120 caracteres
- Inclua o autor/fonte entre parênteses
{emojiInstruction}
{hashtagInstruction}

{sourceInstruction}`,

  sourceInstructions: {
    filme: `Use uma citação famosa de filme relacionada ao tema.
Exemplo: "Que a força esteja com você" (Star Wars)`,

    series: `Use uma frase marcante de série de TV.
Exemplo: "Winter is coming" (Game of Thrones)`,

    musica: `Use um trecho inspirador de música.
Exemplo: "Imagine all the people living life in peace" (John Lennon)`,

    default: `Escolha a fonte mais adequada para "{theme}":
- Autor/escritor famoso
- Personalidade histórica
- Filosofia ou sabedoria popular
- Filme, música ou série (se apropriado)
- Versículo bíblico (para temas espirituais)`
  },

  formatInstructions: `FORMATO:
{formatExample}`,

  colorPalettes: `CORES E FONTES:
Escolha cores harmoniosas baseadas no tema:
- Motivação: vermelho/laranja + branco
- Sucesso: verde + branco
- Amor: roxo/rosa + branco
- Paz: azul + branco
- Fé: azul escuro + cinza claro

Fontes disponíveis: Inter, Poppins, Montserrat, Lato, Open Sans, Playfair Display`,

  examples: `EXEMPLO:
"O sucesso é ir de fracasso em fracasso sem perder o entusiasmo"
(Winston Churchill)

Seja criativo e escolha frases que realmente inspirem!{usedQuotesHint}

RETORNE APENAS no formato especificado, sem texto adicional.`
};

// Função para construir o prompt completo
export function buildPrompt(
  theme: string,
  includeEmojis: boolean,
  includeHashtags: boolean,
  randomSeed: number,
  timeStamp: number,
  currentAttempt: number,
  maxRetries: number,
  usedQuotesHint: string
): string {
  const themeKey = theme.toLowerCase();
  
  // Determinar instrução de fonte
  let sourceInstruction = '';
  if (themeKey.includes('filme')) {
    sourceInstruction = promptConfig.sourceInstructions.filme;
  } else if (themeKey.includes('série') || themeKey.includes('series')) {
    sourceInstruction = promptConfig.sourceInstructions.series;
  } else if (themeKey.includes('música') || themeKey.includes('musica')) {
    sourceInstruction = promptConfig.sourceInstructions.musica;
  } else {
    sourceInstruction = promptConfig.sourceInstructions.default.replace('{theme}', theme);
  }

  // Configurar instruções baseadas nas opções
  const emojiInstruction = includeEmojis ? '• 1 emoji apropriado ao final da frase' : '• NÃO inclua emojis';
  const hashtagInstruction = includeHashtags ? '• Adicione 2-3 hashtags relevantes no final' : '• NÃO inclua hashtags';

  // Definir formato de exemplo
  let formatExample = '';
  if (includeEmojis && includeHashtags) {
    formatExample = `"Frase inspiracional" ✨
(Autor)
#tema #motivacao #inspiracao
background: #3498db
text: #ffffff
font: Poppins`;
  } else if (includeEmojis) {
    formatExample = `"Frase inspiracional" ✨
(Autor)
background: #3498db
text: #ffffff
font: Poppins`;
  } else if (includeHashtags) {
    formatExample = `"Frase inspiracional"
(Autor)
#tema #motivacao
background: #3498db
text: #ffffff
font: Poppins`;
  } else {
    formatExample = `"Frase inspiracional"
(Autor)
background: #3498db
text: #ffffff
font: Poppins`;
  }

  // Construir prompt completo
  let fullPrompt = promptConfig.basePrompt
    .replace('{theme}', theme)
    .replace('{randomSeed}', randomSeed.toString())
    .replace('{timeStamp}', timeStamp.toString())
    .replace('{currentAttempt}', currentAttempt.toString())
    .replace('{sourceInstruction}', sourceInstruction)
    .replace('{emojiInstruction}', emojiInstruction)
    .replace('{hashtagInstruction}', hashtagInstruction);

  fullPrompt += '\n\n' + promptConfig.formatInstructions.replace('{formatExample}', formatExample);
  fullPrompt += '\n\n' + promptConfig.colorPalettes;
  fullPrompt += '\n\n' + promptConfig.examples
    .replace('{usedQuotesHint}', usedQuotesHint);

  return fullPrompt;
}