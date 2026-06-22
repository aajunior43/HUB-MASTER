// Configuração da API do Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Estado do jogo
let gameState = {
    religion: 50,
    military: 50,
    economy: 50,
    people: 50,
    year: 1,
    currentCardIndex: 0,
    useAI: true, // IA sempre ativa
    lastEvents: [],
    currentReignData: {
        startTime: Date.now(),
        decisions: [],
        powerHistory: []
    }
};

// Sistema de Estatísticas
let statsSystem = {
    data: {
        totalGames: 0,
        totalDecisions: 0,
        bestReign: 0,
        reignHistory: [],
        powerStats: {
            religion: { total: 0, min: 100, max: 0, decisions: 0 },
            military: { total: 0, min: 100, max: 0, decisions: 0 },
            economy: { total: 0, min: 100, max: 0, decisions: 0 },
            people: { total: 0, min: 100, max: 0, decisions: 0 }
        },
        achievements: []
    },
    chart: null
};

// Sistema de Conquistas
let achievementSystem = {
    definitions: [
        {
            id: 'first_steps',
            name: 'Primeiros Passos',
            description: 'Tome sua primeira decisão como governante',
            icon: '👑',
            rarity: 'common',
            condition: (stats, current) => stats.totalDecisions >= 1
        },
        {
            id: 'survivor',
            name: 'Sobrevivente',
            description: 'Sobreviva por 10 anos',
            icon: '🛡️',
            rarity: 'common',
            condition: (stats, current) => stats.bestReign >= 10
        },
        {
            id: 'veteran',
            name: 'Veterano',
            description: 'Sobreviva por 25 anos',
            icon: '⚔️',
            rarity: 'rare',
            condition: (stats, current) => stats.bestReign >= 25
        },
        {
            id: 'legend',
            name: 'Lenda',
            description: 'Sobreviva por 50 anos',
            icon: '🏆',
            rarity: 'epic',
            condition: (stats, current) => stats.bestReign >= 50
        },
        {
            id: 'immortal',
            name: 'Imortal',
            description: 'Sobreviva por 100 anos',
            icon: '👑',
            rarity: 'legendary',
            condition: (stats, current) => stats.bestReign >= 100
        },
        {
            id: 'decision_maker',
            name: 'Tomador de Decisões',
            description: 'Tome 100 decisões',
            icon: '🎯',
            rarity: 'common',
            condition: (stats, current) => stats.totalDecisions >= 100
        },
        {
            id: 'wise_ruler',
            name: 'Governante Sábio',
            description: 'Tome 500 decisões',
            icon: '🧠',
            rarity: 'rare',
            condition: (stats, current) => stats.totalDecisions >= 500
        },
        {
            id: 'balanced',
            name: 'Equilibrista',
            description: 'Mantenha todos os poderes entre 40-60 por 5 anos',
            icon: '⚖️',
            rarity: 'rare',
            condition: (stats, current) => {
                if (current.year < 5) return false;
                const history = current.currentReignData.powerHistory.slice(-5);
                return history.every(h => 
                    h.religion >= 40 && h.religion <= 60 &&
                    h.military >= 40 && h.military <= 60 &&
                    h.economy >= 40 && h.economy <= 60 &&
                    h.people >= 40 && h.people <= 60
                );
            }
        },
        {
            id: 'extremist',
            name: 'Extremista',
            description: 'Tenha um poder acima de 90',
            icon: '🔥',
            rarity: 'common',
            condition: (stats, current) => {
                return current.religion > 90 || current.military > 90 || 
                       current.economy > 90 || current.people > 90;
            }
        },
        {
            id: 'crisis_manager',
            name: 'Gestor de Crises',
            description: 'Recupere-se de um poder abaixo de 10',
            icon: '🚑',
            rarity: 'rare',
            condition: (stats, current) => {
                const history = current.currentReignData.powerHistory;
                if (history.length < 2) return false;
                
                for (let i = 1; i < history.length; i++) {
                    const prev = history[i-1];
                    const curr = history[i];
                    
                    const hadCrisis = prev.religion < 10 || prev.military < 10 || 
                                     prev.economy < 10 || prev.people < 10;
                    const recovered = curr.religion >= 30 && curr.military >= 30 && 
                                     curr.economy >= 30 && curr.people >= 30;
                    
                    if (hadCrisis && recovered) return true;
                }
                return false;
            }
        },
        {
            id: 'religious_leader',
            name: 'Líder Religioso',
            description: 'Mantenha a religião acima de 80 por 10 anos',
            icon: '⛪',
            rarity: 'rare',
            condition: (stats, current) => {
                if (current.year < 10) return false;
                const history = current.currentReignData.powerHistory.slice(-10);
                return history.every(h => h.religion >= 80);
            }
        },
        {
            id: 'military_commander',
            name: 'Comandante Militar',
            description: 'Mantenha o poder militar acima de 80 por 10 anos',
            icon: '⚔️',
            rarity: 'rare',
            condition: (stats, current) => {
                if (current.year < 10) return false;
                const history = current.currentReignData.powerHistory.slice(-10);
                return history.every(h => h.military >= 80);
            }
        },
        {
            id: 'economic_genius',
            name: 'Gênio Econômico',
            description: 'Mantenha a economia acima de 80 por 10 anos',
            icon: '💰',
            rarity: 'rare',
            condition: (stats, current) => {
                if (current.year < 10) return false;
                const history = current.currentReignData.powerHistory.slice(-10);
                return history.every(h => h.economy >= 80);
            }
        },
        {
            id: 'peoples_champion',
            name: 'Campeão do Povo',
            description: 'Mantenha o apoio popular acima de 80 por 10 anos',
            icon: '👥',
            rarity: 'rare',
            condition: (stats, current) => {
                if (current.year < 10) return false;
                const history = current.currentReignData.powerHistory.slice(-10);
                return history.every(h => h.people >= 80);
            }
        },
        {
            id: 'persistent',
            name: 'Persistente',
            description: 'Complete 10 reinados',
            icon: '🔄',
            rarity: 'rare',
            condition: (stats, current) => stats.totalGames >= 10
        },
        {
            id: 'perfectionist',
            name: 'Perfeccionista',
            description: 'Alcance uma pontuação acima de 1000',
            icon: '⭐',
            rarity: 'epic',
            condition: (stats, current) => {
                return stats.reignHistory.some(reign => reign.score >= 1000);
            }
        },
        {
            id: 'master_ruler',
            name: 'Mestre Governante',
            description: 'Alcance uma pontuação acima de 2000',
            icon: '👑',
            rarity: 'legendary',
            condition: (stats, current) => {
                return stats.reignHistory.some(reign => reign.score >= 2000);
            }
        },
        {
            id: 'ai_explorer',
            name: 'Explorador de IA',
            description: 'Use o modo IA por 50 decisões',
            icon: '🤖',
            rarity: 'common',
            condition: (stats, current) => {
                // Contar decisões feitas com IA ativa
                let aiDecisions = 0;
                stats.reignHistory.forEach(reign => {
                    aiDecisions += reign.decisions || 0;
                });
                return aiDecisions >= 50;
            }
        },
        {
            id: 'speed_runner',
            name: 'Velocista',
            description: 'Sobreviva 20 anos em menos de 10 minutos',
            icon: '⚡',
            rarity: 'epic',
            condition: (stats, current) => {
                return stats.reignHistory.some(reign => 
                    reign.years >= 20 && 
                    (reign.endTime - reign.startTime) < 600000 // 10 minutos
                );
            }
        },
        {
            id: 'completionist',
            name: 'Completista',
            description: 'Desbloqueie todas as outras conquistas',
            icon: '🏅',
            rarity: 'legendary',
            condition: (stats, current) => {
                const totalAchievements = achievementSystem.definitions.length - 1; // Excluir esta própria conquista
                return stats.achievements.length >= totalAchievements;
            }
        }
    ]
};

// Cartas de eventos/decisões
const cards = [
    {
        character: "🧙‍♂️",
        title: "Conselheiro Real",
        text: "Meu senhor, um comerciante estrangeiro oferece uma grande quantia de ouro em troca de privilégios comerciais exclusivos. O que decidis?",
        leftOption: {
            text: "Aceitar a oferta",
            effects: { economy: 15, people: -10 }
        },
        rightOption: {
            text: "Recusar educadamente",
            effects: { people: 10, economy: -5 }
        }
    },
    {
        character: "⚔️",
        title: "General do Exército",
        text: "Senhor, nossos vizinhos estão se armando. Devemos aumentar nosso exército ou tentar negociar a paz?",
        leftOption: {
            text: "Fortalecer o exército",
            effects: { military: 20, economy: -15 }
        },
        rightOption: {
            text: "Buscar diplomacia",
            effects: { people: 15, military: -10 }
        }
    },
    {
        character: "⛪",
        title: "Alto Sacerdote",
        text: "Majestade, o povo pede por um novo templo, mas isso custará muito dos cofres reais. Como procedemos?",
        leftOption: {
            text: "Construir o templo",
            effects: { religion: 25, economy: -20 }
        },
        rightOption: {
            text: "Adiar a construção",
            effects: { economy: 10, religion: -15 }
        }
    },
    {
        character: "👨‍🌾",
        title: "Representante dos Camponeses",
        text: "Vossa Majestade, a colheita foi ruim este ano. O povo passa fome. Podemos abrir os celeiros reais?",
        leftOption: {
            text: "Distribuir comida",
            effects: { people: 20, economy: -10 }
        },
        rightOption: {
            text: "Preservar os estoques",
            effects: { economy: 5, people: -15 }
        }
    },
    {
        character: "🏰",
        title: "Arquiteto Real",
        text: "Majestade, as muralhas da cidade precisam de reparos urgentes. Devemos usar soldados ou contratar artesãos?",
        leftOption: {
            text: "Usar soldados",
            effects: { military: -10, economy: 10 }
        },
        rightOption: {
            text: "Contratar artesãos",
            effects: { economy: -15, people: 15 }
        }
    },
    {
        character: "🎭",
        title: "Bardo da Corte",
        text: "Senhor, há rumores de descontentamento entre os nobres. Devo espalhar histórias que os favoreçam?",
        leftOption: {
            text: "Favorecer os nobres",
            effects: { economy: 10, people: -10 }
        },
        rightOption: {
            text: "Manter neutralidade",
            effects: { people: 5, religion: 5 }
        }
    },
    {
        character: "🔬",
        title: "Alquimista",
        text: "Majestade, descobri uma nova técnica agrícola, mas preciso de fundos para pesquisa. Investimos?",
        leftOption: {
            text: "Financiar pesquisa",
            effects: { economy: -10, people: 15 }
        },
        rightOption: {
            text: "Negar financiamento",
            effects: { economy: 5, people: -5 }
        }
    },
    {
        character: "🛡️",
        title: "Capitão da Guarda",
        text: "Senhor, bandidos atacam as estradas comerciais. Devo enviar mais guardas ou negociar com eles?",
        leftOption: {
            text: "Enviar mais guardas",
            effects: { military: -15, economy: 20 }
        },
        rightOption: {
            text: "Tentar negociar",
            effects: { economy: -5, people: -10 }
        }
    },
    {
        character: "📚",
        title: "Escriba Real",
        text: "Majestade, devemos criar uma biblioteca pública ou manter os livros apenas para a nobreza?",
        leftOption: {
            text: "Biblioteca pública",
            effects: { people: 20, religion: -10 }
        },
        rightOption: {
            text: "Manter exclusividade",
            effects: { economy: 10, people: -15 }
        }
    },
    {
        character: "🌾",
        title: "Ministro da Agricultura",
        text: "Senhor, uma praga ameaça as colheitas. Podemos usar magia ou métodos tradicionais?",
        leftOption: {
            text: "Usar magia",
            effects: { religion: 15, economy: 10 }
        },
        rightOption: {
            text: "Métodos tradicionais",
            effects: { people: 10, religion: -5 }
        }
    }
];

// Inicializar o jogo
async function initGame() {
    // Registrar estado inicial para estatísticas
    collectGameData();
    
    // Inicializar efeitos visuais
    initVisualEffects();
    
    updatePowerBars();
    await loadRandomCard();
    setupEventListeners();
}

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('left-decision').addEventListener('click', () => makeDecision('left'));
    document.getElementById('right-decision').addEventListener('click', () => makeDecision('right'));
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('stats-btn').addEventListener('click', openStatsModal);
    document.getElementById('close-stats').addEventListener('click', closeStatsModal);
    document.getElementById('audio-btn').addEventListener('click', toggleAudio);
    document.getElementById('theme-btn').addEventListener('click', toggleTheme);
    
    // Event listeners para as abas de estatísticas
    document.querySelectorAll('.stats-tab').forEach(tab => {
        tab.addEventListener('click', () => switchStatsTab(tab.dataset.tab));
    });
}

// Carregar uma carta (IA ou aleatória)
async function loadRandomCard() {
    let card;
    
    if (gameState.useAI) {
        try {
            card = await generateAICard();
        } catch (error) {
            console.warn('Erro na API do Gemini, usando carta estática:', error);
            card = getRandomStaticCard();
        }
    } else {
        card = getRandomStaticCard();
    }
    
    displayCard(card);
    gameState.currentCard = card;
}

// Carregar carta estática aleatória
function getRandomStaticCard() {
    const randomIndex = Math.floor(Math.random() * cards.length);
    return cards[randomIndex];
}

// Exibir carta na interface
function displayCard(card) {
    document.getElementById('card-character').textContent = card.character;
    document.getElementById('card-title').textContent = card.title;
    document.getElementById('card-text').textContent = card.text;
    
    document.getElementById('left-text').textContent = card.leftOption.text;
    document.getElementById('right-text').textContent = card.rightOption.text;
    
    // Mostrar efeitos das decisões
    document.getElementById('left-effects').textContent = formatEffects(card.leftOption.effects);
    document.getElementById('right-effects').textContent = formatEffects(card.rightOption.effects);
}

// Gerar carta usando IA do Gemini
async function generateAICard() {
    const context = getGameContext();
    const prompt = createPrompt(context);
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        })
    });
    
    if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
    }
    
    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text;
    
    return parseAIResponse(aiResponse);
}

// Obter contexto atual do jogo
function getGameContext() {
    const { religion, military, economy, people, year, lastEvents } = gameState;
    
    // Determinar situação crítica
    let criticalSituation = '';
    if (religion <= 20) criticalSituation += 'Crise religiosa. ';
    if (military <= 20) criticalSituation += 'Exército fraco. ';
    if (economy <= 20) criticalSituation += 'Crise econômica. ';
    if (people <= 20) criticalSituation += 'Descontentamento popular. ';
    
    if (religion >= 80) criticalSituation += 'Fanatismo religioso. ';
    if (military >= 80) criticalSituation += 'Militarismo excessivo. ';
    if (economy >= 80) criticalSituation += 'Riqueza excessiva. ';
    if (people >= 80) criticalSituation += 'Populismo extremo. ';
    
    return {
        religion,
        military,
        economy,
        people,
        year,
        criticalSituation: criticalSituation || 'Situação equilibrada',
        lastEvents: lastEvents.slice(-3) // Últimos 3 eventos
    };
}

// Criar prompt para a IA
function createPrompt(context) {
    const difficulty = difficultySystem.level;
    const seasonalContext = getSeasonalContext();
    const narrativeStyle = getNarrativeStyle(context);
    
    return `Você é um mestre narrador criando eventos épicos para um reino medieval/fantasia. Sua missão é gerar uma narrativa envolvente e contextual.

🏰 ESTADO DO REINO:
- Religião: ${context.religion}/100 ${getReligionDescription(context.religion)}
- Militar: ${context.military}/100 ${getMilitaryDescription(context.military)}
- Economia: ${context.economy}/100 ${getEconomyDescription(context.economy)}
- Povo: ${context.people}/100 ${getPeopleDescription(context.people)}
- Ano de Reinado: ${context.year}
- Situação Crítica: ${context.criticalSituation}
- Dificuldade: ${difficulty.toUpperCase()}

📜 CONTEXTO NARRATIVO:
- Eventos Recentes: ${context.lastEvents.join(' → ') || 'Início do reinado'}
- Estilo Narrativo: ${narrativeStyle}
- Contexto Sazonal: ${seasonalContext}

🎭 DIRETRIZES CRIATIVAS:
1. **Narrativa Rica**: Use linguagem medieval/fantasia envolvente
2. **Personagens Memoráveis**: Crie NPCs com personalidade única
3. **Dilemas Complexos**: Apresente escolhas moralmente ambíguas
4. **Consequências Lógicas**: Efeitos devem fazer sentido narrativo
5. **Progressão Temporal**: Considere a evolução do reino
6. **Tensão Dramática**: Crie momentos de suspense e emoção

⚖️ BALANCEAMENTO (Dificuldade ${difficulty}):
- Efeitos: ${difficulty === 'easy' ? 'Moderados (-15 a +15)' : difficulty === 'normal' ? 'Equilibrados (-20 a +20)' : 'Intensos (-25 a +25)'}
- Foque em: ${getFocusArea(context)}

🎪 TIPOS DE EVENTOS SUGERIDOS:
${getEventSuggestions(context)}

Crie um evento ÉPICO que:
- Seja uma continuação natural dos eventos recentes
- Reflita o estado atual do reino de forma inteligente
- Apresente um dilema fascinante com consequências significativas
- Use linguagem rica e imersiva
- Tenha um personagem carismático com motivações claras

Responda EXATAMENTE neste formato JSON:
{
  "character": "🧙‍♂️",
  "title": "Arquimago da Corte",
  "text": "Uma narrativa rica e envolvente de 2-3 frases que estabelece o cenário, apresenta o conflito e termina com uma pergunta dramática que força uma decisão difícil.",
  "leftOption": {
    "text": "Opção com consequências claras",
    "effects": {"religion": 15, "economy": -10}
  },
  "rightOption": {
    "text": "Alternativa com trade-offs interessantes",
    "effects": {"people": 12, "military": -8}
  }
}

ATRIBUTOS VÁLIDOS: religion, military, economy, people
Seja CRIATIVO, DRAMÁTICO e ENVOLVENTE! 🎭✨`;
}

// Obter descrição contextual da religião
function getReligionDescription(value) {
    if (value >= 80) return '(Fanatismo religioso)';
    if (value >= 60) return '(Fé forte)';
    if (value >= 40) return '(Fé moderada)';
    if (value >= 20) return '(Fé fraca)';
    return '(Crise de fé)';
}

// Obter descrição contextual do militar
function getMilitaryDescription(value) {
    if (value >= 80) return '(Exército poderoso)';
    if (value >= 60) return '(Forças bem treinadas)';
    if (value >= 40) return '(Defesas adequadas)';
    if (value >= 20) return '(Exército fraco)';
    return '(Defensas críticas)';
}

// Obter descrição contextual da economia
function getEconomyDescription(value) {
    if (value >= 80) return '(Prosperidade abundante)';
    if (value >= 60) return '(Economia próspera)';
    if (value >= 40) return '(Situação estável)';
    if (value >= 20) return '(Dificuldades financeiras)';
    return '(Crise econômica)';
}

// Obter descrição contextual do povo
function getPeopleDescription(value) {
    if (value >= 80) return '(Adoração popular)';
    if (value >= 60) return '(Apoio forte)';
    if (value >= 40) return '(Satisfação moderada)';
    if (value >= 20) return '(Descontentamento)';
    return '(Revolta iminente)';
}

// Obter contexto sazonal
function getSeasonalContext() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'Primavera - Tempo de renovação e crescimento';
    if (month >= 5 && month <= 7) return 'Verão - Época de colheitas e festivais';
    if (month >= 8 && month <= 10) return 'Outono - Preparação para o inverno';
    return 'Inverno - Tempos difíceis e reflexão';
}

// Obter estilo narrativo baseado no contexto
function getNarrativeStyle(context) {
    const totalPower = context.religion + context.military + context.economy + context.people;
    if (totalPower >= 300) return 'Épico e triunfante';
    if (totalPower >= 200) return 'Dramático e tenso';
    if (totalPower >= 150) return 'Melancólico e reflexivo';
    return 'Sombrio e desesperador';
}

// Obter área de foco baseada no estado
function getFocusArea(context) {
    const powers = {
        religion: context.religion,
        military: context.military,
        economy: context.economy,
        people: context.people
    };
    
    const lowest = Object.entries(powers).sort((a, b) => a[1] - b[1])[0][0];
    const highest = Object.entries(powers).sort((a, b) => b[1] - a[1])[0][0];
    
    if (powers[lowest] < 30) return `Recuperar ${lowest} (crítico)`;
    if (powers[highest] > 70) return `Balancear ${highest} (muito alto)`;
    return 'Manter equilíbrio geral';
}

// Obter sugestões de eventos
function getEventSuggestions(context) {
    const suggestions = [];
    
    if (context.religion < 30) suggestions.push('- Crise religiosa: heresias, cismas, perda de fé');
    if (context.military < 30) suggestions.push('- Ameaças militares: invasões, rebeliões, defesas fracas');
    if (context.economy < 30) suggestions.push('- Crise econômica: fome, impostos, comércio');
    if (context.people < 30) suggestions.push('- Descontentamento: protestos, demandas populares');
    
    if (context.year > 20) suggestions.push('- Eventos de longo prazo: sucessão, legado, reformas');
    if (context.year < 5) suggestions.push('- Estabelecimento: primeiras impressões, alianças iniciais');
    
    suggestions.push('- Eventos diplomáticos: embaixadores, tratados, casamentos');
    suggestions.push('- Mistérios: profecias, artefatos mágicos, conspirações');
    suggestions.push('- Desastres naturais: pragas, terremotos, secas');
    
    return suggestions.join('\n');
}

// Analisar resposta da IA
function parseAIResponse(aiResponse) {
    try {
        // Extrair JSON da resposta
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('JSON não encontrado na resposta');
        }
        
        const cardData = JSON.parse(jsonMatch[0]);
        
        // Validar estrutura
        if (!cardData.character || !cardData.title || !cardData.text || 
            !cardData.leftOption || !cardData.rightOption) {
            throw new Error('Estrutura de carta inválida');
        }
        
        return cardData;
    } catch (error) {
        console.error('Erro ao analisar resposta da IA:', error);
        throw error;
    }
}

// Formatar efeitos para exibição
function formatEffects(effects) {
    const icons = {
        religion: '⛪',
        military: '⚔️',
        economy: '💰',
        people: '👥'
    };
    
    return Object.entries(effects)
        .map(([key, value]) => `${icons[key]} ${value > 0 ? '+' : ''}${value}`)
        .join(' | ');
}

// Tomar decisão
function makeDecision(side) {
    const card = gameState.currentCard;
    const effects = side === 'left' ? card.leftOption.effects : card.rightOption.effects;
    const chosenOption = side === 'left' ? card.leftOption.text : card.rightOption.text;
    
    // Registrar decisão para estatísticas
    const decisionData = {
        cardTitle: card.title,
        option: chosenOption,
        effects: effects,
        timestamp: Date.now(),
        year: gameState.year
    };
    gameState.currentReignData.decisions.push(decisionData);
    
    // Registrar evento para contexto da IA
    const eventDescription = `${card.title}: ${chosenOption}`;
    gameState.lastEvents.push(eventDescription);
    
    // Manter apenas os últimos 5 eventos
    if (gameState.lastEvents.length > 5) {
        gameState.lastEvents.shift();
    }
    
    // Aplicar modificadores de dificuldade
    const modifiedEffects = applyDifficultyModifiers(effects);
    
    // Aplicar efeitos
    Object.entries(modifiedEffects).forEach(([key, value]) => {
        gameState[key] = Math.max(0, Math.min(100, gameState[key] + value));
    });
    
    // Atualizar ano
    gameState.year++;
    document.getElementById('year').textContent = gameState.year;
    
    // Animar mudança de ano
    animateYearChange();
    
    // Som de mudança de ano
    playYearChangeSound();
    
    // Coletar dados para estatísticas
    collectGameData();
    
    // Calcular dificuldade adaptativa
    if (gameState.year % 5 === 0) { // A cada 5 anos
        calculateAdaptiveDifficulty();
    }
    
    // Atualizar barras de poder
    updatePowerBars();
    
    // Animar barras de poder
    animatePowerBars();
    
    // Verificar sons de poder crítico
    const powers = ['religion', 'military', 'economy', 'people'];
    powers.forEach(power => {
        if (gameState[power] <= 20 || gameState[power] >= 90) {
            playCriticalPowerSound();
        }
    });
    
    // Verificar game over
    if (checkGameOver()) {
        return;
    }
    
    // Som de decisão
    playDecisionSound();
    
    // Carregar próxima carta após um delay
    setTimeout(async () => {
        await loadRandomCard();
        animateCardChange();
        playCardFlipSound();
    }, 1000);
    
    // Adicionar efeito visual
    document.querySelector('.card').classList.add('pulse');
    setTimeout(() => {
        document.querySelector('.card').classList.remove('pulse');
    }, 600);
}

// Atualizar barras de poder
function updatePowerBars() {
    const powers = ['religion', 'military', 'economy', 'people'];
    
    powers.forEach(power => {
        const value = gameState[power];
        const bar = document.getElementById(`${power}-bar`);
        const valueElement = document.getElementById(`${power}-value`);
        
        bar.style.width = `${value}%`;
        valueElement.textContent = value;
        
        // Adicionar efeito visual se valor estiver crítico
        if (value <= 10 || value >= 90) {
            bar.parentElement.classList.add('shake');
            setTimeout(() => {
                bar.parentElement.classList.remove('shake');
            }, 500);
        }
    });
}

// Verificar condições de game over
function checkGameOver() {
    const powers = ['religion', 'military', 'economy', 'people'];
    
    for (let power of powers) {
        if (gameState[power] <= 0) {
            showGameOver(`O reino entrou em colapso! ${getGameOverMessage(power, 'low')}`);
            return true;
        }
        if (gameState[power] >= 100) {
            showGameOver(`O reino entrou em colapso! ${getGameOverMessage(power, 'high')}`);
            return true;
        }
    }
    
    return false;
}

// Mensagens de game over
function getGameOverMessage(power, level) {
    const messages = {
        religion: {
            low: "A falta de fé levou o reino ao caos e à anarquia.",
            high: "O fanatismo religioso destruiu a tolerância e a paz."
        },
        military: {
            low: "Sem defesas, o reino foi conquistado por inimigos.",
            high: "O militarismo excessivo levou a uma ditadura opressiva."
        },
        economy: {
            low: "A pobreza extrema causou revoltas e fome generalizada.",
            high: "A ganância descontrolada criou uma desigualdade insustentável."
        },
        people: {
            low: "O descontentamento popular resultou em uma revolução.",
            high: "O populismo extremo levou à instabilidade política."
        }
    };
    
    return messages[power][level];
}

// Mostrar tela de game over
function showGameOver(message) {
    // Finalizar reinado e salvar estatísticas
    endReign('game_over');
    
    // Efeito visual de game over
    showGameOverEffect();
    
    // Som de game over
    playGameOverSound();
    
    document.getElementById('game-over-message').textContent = message;
    document.getElementById('game-over-modal').style.display = 'flex';
    document.getElementById('restart-btn').style.display = 'block';
    
    // Animar modal
    animateModalOpen(document.getElementById('game-over-modal'));
}

// Reiniciar jogo
async function restartGame() {
    gameState = {
        religion: 50,
        military: 50,
        economy: 50,
        people: 50,
        year: 1,
        currentCardIndex: 0,
        useAI: gameState.useAI, // Manter configuração de IA
        lastEvents: [],
        currentReignData: {
            startTime: Date.now(),
            decisions: [],
            powerHistory: []
        }
    };
    
    // Registrar estado inicial
    collectGameData();
    
    document.getElementById('game-over-modal').style.display = 'none';
    document.getElementById('restart-btn').style.display = 'none';
    document.getElementById('year').textContent = '1';
    
    updatePowerBars();
    await loadRandomCard();
}

// IA sempre ativa - função removida para simplificação

// === SISTEMA DE ESTATÍSTICAS ===

// Carregar estatísticas do localStorage
function loadStats() {
    const savedStats = localStorage.getItem('reino-stats');
    if (savedStats) {
        statsSystem.data = { ...statsSystem.data, ...JSON.parse(savedStats) };
    }
}

// Salvar estatísticas no localStorage
function saveStats() {
    localStorage.setItem('reino-stats', JSON.stringify(statsSystem.data));
}

// Coletar dados durante o gameplay
function collectGameData() {
    // Registrar estado atual dos poderes
    const currentPowers = {
        religion: gameState.religion,
        military: gameState.military,
        economy: gameState.economy,
        people: gameState.people,
        year: gameState.year,
        timestamp: Date.now()
    };
    
    gameState.currentReignData.powerHistory.push(currentPowers);
    
    // Atualizar estatísticas de poderes
    ['religion', 'military', 'economy', 'people'].forEach(power => {
        const value = gameState[power];
        const stats = statsSystem.data.powerStats[power];
        
        stats.total += value;
        stats.min = Math.min(stats.min, value);
        stats.max = Math.max(stats.max, value);
        stats.decisions++;
    });
    
    statsSystem.data.totalDecisions++;
    
    // Verificar conquistas
    checkAchievements();
}

// Finalizar reinado e salvar dados
function endReign(reason = 'game_over') {
    const reignData = {
        id: Date.now(),
        startTime: gameState.currentReignData.startTime,
        endTime: Date.now(),
        years: gameState.year,
        decisions: gameState.currentReignData.decisions.length,
        powerHistory: gameState.currentReignData.powerHistory,
        endReason: reason,
        finalPowers: {
            religion: gameState.religion,
            military: gameState.military,
            economy: gameState.economy,
            people: gameState.people
        },
        score: calculateScore()
    };
    
    statsSystem.data.reignHistory.push(reignData);
    statsSystem.data.totalGames++;
    
    if (gameState.year > statsSystem.data.bestReign) {
        statsSystem.data.bestReign = gameState.year;
    }
    
    saveStats();
}

// Calcular pontuação do reinado
function calculateScore() {
    const years = gameState.year;
    const balance = calculateBalance();
    const decisions = gameState.currentReignData.decisions.length;
    
    // Fórmula: anos * equilíbrio * (1 + decisões/100)
    return Math.round(years * balance * (1 + decisions / 100));
}

// Calcular equilíbrio médio dos poderes
function calculateBalance() {
    const powers = [gameState.religion, gameState.military, gameState.economy, gameState.people];
    const avg = powers.reduce((sum, power) => sum + power, 0) / 4;
    const variance = powers.reduce((sum, power) => sum + Math.pow(power - avg, 2), 0) / 4;
    const stability = Math.max(0, 100 - Math.sqrt(variance));
    return stability / 100;
}

// Abrir modal de estatísticas
function openStatsModal() {
    document.getElementById('stats-modal').style.display = 'flex';
    updateStatsDisplay();
    switchStatsTab('overview');
    
    // Animar modal
    animateModalOpen(document.getElementById('stats-modal'));
    
    // Animar estatísticas
    setTimeout(() => {
        animateStats();
    }, 200);
}

// Fechar modal de estatísticas
function closeStatsModal() {
    document.getElementById('stats-modal').style.display = 'none';
    if (statsSystem.chart) {
        statsSystem.chart.destroy();
        statsSystem.chart = null;
    }
}

// Alternar entre abas de estatísticas
function switchStatsTab(tabName) {
    // Remover classe active de todas as abas e painéis
    document.querySelectorAll('.stats-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.stats-panel').forEach(panel => panel.classList.remove('active'));
    
    // Ativar aba e painel selecionados
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-panel`).classList.add('active');
    
    // Carregar conteúdo específico da aba
    switch(tabName) {
        case 'overview':
            updateOverviewStats();
            break;
        case 'history':
            updateHistoryStats();
            break;
        case 'ranking':
            updateRankingStats();
            break;
        case 'charts':
            updateChartsStats();
            break;
        case 'achievements':
            updateAchievementsStats();
            break;
    }
}

// Atualizar display geral das estatísticas
function updateStatsDisplay() {
    document.getElementById('current-year').textContent = `Ano ${gameState.year}`;
    document.getElementById('best-reign').textContent = statsSystem.data.bestReign;
    document.getElementById('total-decisions').textContent = statsSystem.data.totalDecisions;
    document.getElementById('avg-balance').textContent = `${Math.round(calculateBalance() * 100)}%`;
}

// Atualizar estatísticas da visão geral
function updateOverviewStats() {
    updateStatsDisplay();
    
    // Atualizar estatísticas por poder
    const powerStatsGrid = document.getElementById('power-stats-grid');
    powerStatsGrid.innerHTML = '';
    
    const powerIcons = {
        religion: '⛪',
        military: '⚔️',
        economy: '💰',
        people: '👥'
    };
    
    const powerNames = {
        religion: 'Religião',
        military: 'Militar',
        economy: 'Economia',
        people: 'Povo'
    };
    
    Object.entries(statsSystem.data.powerStats).forEach(([power, stats]) => {
        const avg = stats.decisions > 0 ? Math.round(stats.total / stats.decisions) : 0;
        
        const card = document.createElement('div');
        card.className = `power-stat-card ${power}`;
        card.innerHTML = `
            <div class="power-stat-header">
                <div class="power-stat-icon">${powerIcons[power]}</div>
                <div class="power-stat-name">${powerNames[power]}</div>
            </div>
            <div class="power-stat-details">
                <div class="power-stat-item">
                    <div class="power-stat-item-value">${avg}</div>
                    <div class="power-stat-item-label">Média</div>
                </div>
                <div class="power-stat-item">
                    <div class="power-stat-item-value">${stats.min}</div>
                    <div class="power-stat-item-label">Mínimo</div>
                </div>
                <div class="power-stat-item">
                    <div class="power-stat-item-value">${stats.max}</div>
                    <div class="power-stat-item-label">Máximo</div>
                </div>
            </div>
        `;
        powerStatsGrid.appendChild(card);
    });
}

// Atualizar histórico de reinados
function updateHistoryStats() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    if (statsSystem.data.reignHistory.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">Nenhum reinado concluído ainda.</p>';
        return;
    }
    
    const sortedHistory = [...statsSystem.data.reignHistory].sort((a, b) => b.years - a.years);
    
    sortedHistory.forEach((reign, index) => {
        const isBest = reign.years === statsSystem.data.bestReign;
        const duration = Math.round((reign.endTime - reign.startTime) / 60000); // em minutos
        
        const item = document.createElement('div');
        item.className = `history-item ${isBest ? 'best' : ''}`;
        item.innerHTML = `
            <div class="history-info">
                <div class="history-title">
                    ${isBest ? '👑 ' : ''}Reinado #${statsSystem.data.reignHistory.length - statsSystem.data.reignHistory.indexOf(reign)}
                </div>
                <div class="history-details">
                    ${reign.decisions} decisões • ${duration} min de duração • Pontuação: ${reign.score}
                </div>
            </div>
            <div class="history-score">
                <div class="history-years">${reign.years}</div>
                <div class="history-date">${new Date(reign.endTime).toLocaleDateString()}</div>
            </div>
        `;
        historyList.appendChild(item);
    });
}

// Atualizar ranking de performances
function updateRankingStats() {
    const rankingList = document.getElementById('ranking-list');
    rankingList.innerHTML = '';
    
    if (statsSystem.data.reignHistory.length === 0) {
        rankingList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">Nenhum reinado para classificar ainda.</p>';
        return;
    }
    
    const sortedRanking = [...statsSystem.data.reignHistory]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // Top 10
    
    sortedRanking.forEach((reign, index) => {
        const position = index + 1;
        let positionClass = 'other';
        
        if (position === 1) positionClass = 'gold';
        else if (position === 2) positionClass = 'silver';
        else if (position === 3) positionClass = 'bronze';
        
        const item = document.createElement('div');
        item.className = 'ranking-item';
        item.innerHTML = `
            <div class="ranking-position ${positionClass}">${position}</div>
            <div class="ranking-info">
                <div class="ranking-score">${reign.score} pontos</div>
                <div class="ranking-details">
                    ${reign.years} anos • ${reign.decisions} decisões • ${new Date(reign.endTime).toLocaleDateString()}
                </div>
            </div>
        `;
        rankingList.appendChild(item);
    });
}

// Atualizar gráficos
function updateChartsStats() {
    showChart('current');
}

// Mostrar gráfico específico
function showChart(type) {
    const ctx = document.getElementById('powers-chart').getContext('2d');
    
    // Destruir gráfico anterior se existir
    if (statsSystem.chart) {
        statsSystem.chart.destroy();
    }
    
    let data, title;
    
    switch(type) {
        case 'current':
            data = getCurrentReignChartData();
            title = 'Evolução do Reino Atual';
            break;
        case 'best':
            data = getBestReignChartData();
            title = 'Evolução do Melhor Reinado';
            break;
        case 'average':
            data = getAverageChartData();
            title = 'Média Histórica dos Poderes';
            break;
    }
    
    // Atualizar botões ativos
    document.querySelectorAll('.chart-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="showChart('${type}')"]`).classList.add('active');
    
    statsSystem.chart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Nível do Poder'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Anos'
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.4
                },
                point: {
                    radius: 4,
                    hoverRadius: 6
                }
            }
        }
    });
}

// Obter dados do gráfico do reino atual
function getCurrentReignChartData() {
    const history = gameState.currentReignData.powerHistory;
    
    return {
        labels: history.map(h => `Ano ${h.year}`),
        datasets: [
            {
                label: 'Religião',
                data: history.map(h => h.religion),
                borderColor: '#fbbf24',
                backgroundColor: 'rgba(251, 191, 36, 0.1)'
            },
            {
                label: 'Militar',
                data: history.map(h => h.military),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)'
            },
            {
                label: 'Economia',
                data: history.map(h => h.economy),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)'
            },
            {
                label: 'Povo',
                data: history.map(h => h.people),
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)'
            }
        ]
    };
}

// Obter dados do gráfico do melhor reinado
function getBestReignChartData() {
    const bestReign = statsSystem.data.reignHistory.find(r => r.years === statsSystem.data.bestReign);
    
    if (!bestReign || !bestReign.powerHistory) {
        return {
            labels: ['Ano 1'],
            datasets: [
                { label: 'Religião', data: [50], borderColor: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.1)' },
                { label: 'Militar', data: [50], borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                { label: 'Economia', data: [50], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' },
                { label: 'Povo', data: [50], borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)' }
            ]
        };
    }
    
    return {
        labels: bestReign.powerHistory.map(h => `Ano ${h.year}`),
        datasets: [
            {
                label: 'Religião',
                data: bestReign.powerHistory.map(h => h.religion),
                borderColor: '#fbbf24',
                backgroundColor: 'rgba(251, 191, 36, 0.1)'
            },
            {
                label: 'Militar',
                data: bestReign.powerHistory.map(h => h.military),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)'
            },
            {
                label: 'Economia',
                data: bestReign.powerHistory.map(h => h.economy),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)'
            },
            {
                label: 'Povo',
                data: bestReign.powerHistory.map(h => h.people),
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)'
            }
        ]
    };
}

// Obter dados do gráfico de média histórica
function getAverageChartData() {
    if (statsSystem.data.reignHistory.length === 0) {
        return {
            labels: ['Início'],
            datasets: [
                { label: 'Religião', data: [50], borderColor: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.1)' },
                { label: 'Militar', data: [50], borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                { label: 'Economia', data: [50], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' },
                { label: 'Povo', data: [50], borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)' }
            ]
        };
    }
    
    const stats = statsSystem.data.powerStats;
    const avgData = {
        religion: stats.religion.decisions > 0 ? stats.religion.total / stats.religion.decisions : 50,
        military: stats.military.decisions > 0 ? stats.military.total / stats.military.decisions : 50,
        economy: stats.economy.decisions > 0 ? stats.economy.total / stats.economy.decisions : 50,
        people: stats.people.decisions > 0 ? stats.people.total / stats.people.decisions : 50
    };
    
    return {
        labels: ['Média Histórica'],
        datasets: [
            {
                label: 'Religião',
                data: [avgData.religion],
                borderColor: '#fbbf24',
                backgroundColor: 'rgba(251, 191, 36, 0.3)',
                pointRadius: 8
            },
            {
                label: 'Militar',
                data: [avgData.military],
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.3)',
                pointRadius: 8
            },
            {
                label: 'Economia',
                data: [avgData.economy],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.3)',
                pointRadius: 8
            },
            {
                label: 'Povo',
                data: [avgData.people],
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.3)',
                pointRadius: 8
            }
        ]
    };
}

// === SISTEMA DE CONQUISTAS ===

// Verificar conquistas
function checkAchievements() {
    achievementSystem.definitions.forEach(achievement => {
        // Verificar se já foi desbloqueada
        if (statsSystem.data.achievements.some(a => a.id === achievement.id)) {
            return;
        }
        
        // Verificar condição
        if (achievement.condition(statsSystem.data, gameState)) {
            unlockAchievement(achievement);
        }
    });
}

// Desbloquear conquista
function unlockAchievement(achievement) {
    const unlockedAchievement = {
        ...achievement,
        unlockedAt: Date.now()
    };
    
    statsSystem.data.achievements.push(unlockedAchievement);
    saveStats();
    
    // Efeito especial para carta se for conquista importante
    if (achievement.rarity === 'epic' || achievement.rarity === 'legendary') {
        makeCardSpecial();
    }
    
    // Som de conquista
    playAchievementSound(achievement.rarity);
    
    // Mostrar notificação
    showAchievementNotification(achievement);
}

// Mostrar notificação de conquista
function showAchievementNotification(achievement) {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
        <div class="achievement-notification-header">
            <div class="achievement-notification-icon">${achievement.icon}</div>
            <div class="achievement-notification-title">Conquista Desbloqueada!</div>
        </div>
        <div class="achievement-notification-description">
            <strong>${achievement.name}</strong><br>
            ${achievement.description}
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Remover após 4 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 4000);
}

// Atualizar estatísticas de conquistas
function updateAchievementsStats() {
    const unlockedCount = statsSystem.data.achievements.length;
    const totalCount = achievementSystem.definitions.length;
    const progressPercent = Math.round((unlockedCount / totalCount) * 100);
    
    // Atualizar contadores
    document.getElementById('achievement-count').textContent = unlockedCount;
    document.getElementById('achievement-total').textContent = totalCount;
    document.getElementById('achievement-progress').style.width = `${progressPercent}%`;
    document.getElementById('achievement-progress-text').textContent = `${progressPercent}% Completo`;
    
    // Atualizar grid de conquistas
    const achievementsGrid = document.getElementById('achievements-grid');
    achievementsGrid.innerHTML = '';
    
    achievementSystem.definitions.forEach(achievement => {
        const isUnlocked = statsSystem.data.achievements.some(a => a.id === achievement.id);
        const unlockedData = statsSystem.data.achievements.find(a => a.id === achievement.id);
        
        const card = document.createElement('div');
        card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        
        let dateText = '';
        if (isUnlocked && unlockedData) {
            dateText = `<div class="achievement-date">Desbloqueada em ${new Date(unlockedData.unlockedAt).toLocaleDateString()}</div>`;
        }
        
        card.innerHTML = `
            <div class="achievement-rarity ${achievement.rarity}">${achievement.rarity}</div>
            <div class="achievement-header">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-description">${achievement.description}</div>
                </div>
            </div>
            ${dateText}
        `;
        
        achievementsGrid.appendChild(card);
    });
}

// Obter progresso de conquistas
function getAchievementProgress() {
    const unlocked = statsSystem.data.achievements.length;
    const total = achievementSystem.definitions.length;
    return {
        unlocked,
        total,
        percentage: Math.round((unlocked / total) * 100)
    };
}

// Verificar conquista específica
function hasAchievement(achievementId) {
    return statsSystem.data.achievements.some(a => a.id === achievementId);
}

// Obter conquistas por raridade
function getAchievementsByRarity(rarity) {
    return achievementSystem.definitions
        .filter(a => a.rarity === rarity)
        .map(a => ({
            ...a,
            unlocked: hasAchievement(a.id)
        }));
}

// === SISTEMA DE EFEITOS VISUAIS ===

// Inicializar efeitos visuais
function initVisualEffects() {
    createParticles();
    enhanceButtons();
    setupVisualFeedback();
}

// Criar partículas de fundo
function createParticles() {
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles';
    document.body.appendChild(particlesContainer);
    
    // Criar 20 partículas
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Posição aleatória
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        
        // Delay aleatório
        particle.style.animationDelay = Math.random() * 6 + 's';
        
        particlesContainer.appendChild(particle);
    }
}

// Melhorar botões com efeitos
function enhanceButtons() {
    document.querySelectorAll('.decision-btn').forEach(btn => {
        btn.classList.add('enhanced');
    });
}

// Configurar feedback visual
function setupVisualFeedback() {
    // Adicionar efeitos de hover dinâmicos
    document.querySelectorAll('.power-bar').forEach(bar => {
        bar.addEventListener('mouseenter', () => {
            bar.style.transform = 'scale(1.02)';
        });
        
        bar.addEventListener('mouseleave', () => {
            bar.style.transform = 'scale(1)';
        });
    });
}

// Animar mudança de carta
function animateCardChange() {
    const card = document.querySelector('.card');
    card.classList.add('card-enter');
    
    setTimeout(() => {
        card.classList.remove('card-enter');
    }, 800);
}

// Animar mudança de ano
function animateYearChange() {
    const yearElement = document.getElementById('year');
    yearElement.classList.add('year-change');
    
    setTimeout(() => {
        yearElement.classList.remove('year-change');
    }, 1000);
}

// Animar barras de poder
function animatePowerBars() {
    const powers = ['religion', 'military', 'economy', 'people'];
    
    powers.forEach(power => {
        const value = gameState[power];
        const powerBar = document.querySelector(`.power-bar:has(#${power}-bar)`);
        
        // Remover classes anteriores
        powerBar.classList.remove('critical', 'excellent');
        
        // Adicionar efeitos baseados no valor
        if (value <= 20) {
            powerBar.classList.add('critical');
        } else if (value >= 80) {
            powerBar.classList.add('excellent');
        }
    });
}

// Criar efeito de sparkles para conquistas
function createSparkles(element) {
    for (let i = 0; i < 5; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        element.appendChild(sparkle);
        
        // Remover após animação
        setTimeout(() => {
            if (sparkle.parentNode) {
                sparkle.parentNode.removeChild(sparkle);
            }
        }, 1500);
    }
}

// Efeito de sucesso
function showSuccessEffect(element) {
    element.classList.add('success-flash');
    setTimeout(() => {
        element.classList.remove('success-flash');
    }, 300);
}

// Efeito de erro
function showErrorEffect(element) {
    element.classList.add('error-flash');
    setTimeout(() => {
        element.classList.remove('error-flash');
    }, 500);
}

// Efeito de game over
function showGameOverEffect() {
    const gameOverEffect = document.createElement('div');
    gameOverEffect.className = 'game-over-effect';
    document.body.appendChild(gameOverEffect);
    
    setTimeout(() => {
        if (gameOverEffect.parentNode) {
            gameOverEffect.parentNode.removeChild(gameOverEffect);
        }
    }, 2000);
}

// Animar estatísticas
function animateStats() {
    document.querySelectorAll('.stat-card').forEach((card, index) => {
        card.classList.add('animate');
        card.style.animationDelay = (index * 0.1) + 's';
        
        setTimeout(() => {
            card.classList.remove('animate');
        }, 600 + (index * 100));
    });
}

// Efeito de contagem para números
function animateNumber(element, start, end, duration = 1000) {
    const startTime = performance.now();
    const startValue = parseInt(start) || 0;
    const endValue = parseInt(end) || 0;
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentValue = Math.round(startValue + (endValue - startValue) * progress);
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

// Efeito de loading
function showLoadingSpinner(container) {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    container.appendChild(spinner);
    return spinner;
}

// Remover loading
function hideLoadingSpinner(spinner) {
    if (spinner && spinner.parentNode) {
        spinner.parentNode.removeChild(spinner);
    }
}

// Efeito especial para cartas importantes
function makeCardSpecial() {
    const card = document.querySelector('.card');
    card.classList.add('card-special');
    
    setTimeout(() => {
        card.classList.remove('card-special');
    }, 3000);
}

// Efeito de transição para modais
function animateModalOpen(modal) {
    modal.classList.add('modal-enter');
    setTimeout(() => {
        modal.classList.remove('modal-enter');
    }, 500);
}

// Efeito de pulsação para elementos importantes
function pulseElement(element, duration = 2000) {
    element.style.animation = 'pulse 0.6s ease-in-out';
    
    setTimeout(() => {
        element.style.animation = '';
    }, duration);
}

// Efeito de brilho para conquistas
function glowElement(element, duration = 3000) {
    element.style.animation = 'glow-pulse 1s ease-in-out infinite';
    
    setTimeout(() => {
        element.style.animation = '';
    }, duration);
}

// === SISTEMA DE ÁUDIO ===

// Sistema de áudio
let audioSystem = {
    enabled: true,
    volume: 0.3,
    sounds: {},
    backgroundMusic: null
};

// Inicializar sistema de áudio
function initAudioSystem() {
    // Carregar configuração de áudio
    const savedAudioSettings = localStorage.getItem('reino-audio');
    if (savedAudioSettings) {
        audioSystem = { ...audioSystem, ...JSON.parse(savedAudioSettings) };
    }
    
    // Atualizar botão de áudio
    updateAudioButton();
    
    // Criar sons usando Web Audio API ou sons sintéticos
    createSyntheticSounds();
    
    // Iniciar música de fundo
    if (audioSystem.enabled) {
        startBackgroundMusic();
    }
}

// Criar sons sintéticos
function createSyntheticSounds() {
    audioSystem.sounds = {
        decision: createTone(440, 0.1, 'sine'),
        success: createTone(523, 0.2, 'sine'),
        error: createTone(220, 0.3, 'sawtooth'),
        achievement: createChord([523, 659, 784], 0.5),
        gameOver: createTone(147, 1, 'sawtooth'),
        cardFlip: createTone(330, 0.1, 'triangle'),
        yearChange: createTone(880, 0.15, 'sine'),
        powerCritical: createTone(185, 0.2, 'square')
    };
}

// Criar tom sintético
function createTone(frequency, duration, waveType = 'sine') {
    return () => {
        if (!audioSystem.enabled) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            oscillator.type = waveType;
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(audioSystem.volume * 0.1, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        } catch (error) {
            console.warn('Erro ao reproduzir som:', error);
        }
    };
}

// Criar acorde
function createChord(frequencies, duration) {
    return () => {
        if (!audioSystem.enabled) return;
        
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                createTone(freq, duration * 0.8, 'sine')();
            }, index * 50);
        });
    };
}

// Música de fundo sintética
function startBackgroundMusic() {
    if (!audioSystem.enabled || audioSystem.backgroundMusic) return;
    
    const melodyNotes = [261, 294, 329, 349, 392, 440, 493, 523]; // C4 to C5
    let currentNote = 0;
    
    function playNextNote() {
        if (!audioSystem.enabled) return;
        
        const frequency = melodyNotes[currentNote % melodyNotes.length];
        const oscillator = createTone(frequency, 2, 'sine');
        
        // Tocar nota com volume muito baixo
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
            osc.type = 'sine';
            
            gain.gain.setValueAtTime(0, audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(audioSystem.volume * 0.02, audioContext.currentTime + 0.1);
            gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1.8);
            
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 2);
        } catch (error) {
            console.warn('Erro na música de fundo:', error);
        }
        
        currentNote++;
        
        // Próxima nota em 3-5 segundos
        audioSystem.backgroundMusic = setTimeout(playNextNote, 3000 + Math.random() * 2000);
    }
    
    // Começar após 2 segundos
    audioSystem.backgroundMusic = setTimeout(playNextNote, 2000);
}

// Parar música de fundo
function stopBackgroundMusic() {
    if (audioSystem.backgroundMusic) {
        clearTimeout(audioSystem.backgroundMusic);
        audioSystem.backgroundMusic = null;
    }
}

// Tocar som
function playSound(soundName) {
    if (!audioSystem.enabled || !audioSystem.sounds[soundName]) return;
    
    try {
        audioSystem.sounds[soundName]();
    } catch (error) {
        console.warn(`Erro ao tocar som ${soundName}:`, error);
    }
}

// Alternar áudio
function toggleAudio() {
    audioSystem.enabled = !audioSystem.enabled;
    
    if (audioSystem.enabled) {
        startBackgroundMusic();
        playSound('success');
    } else {
        stopBackgroundMusic();
    }
    
    updateAudioButton();
    saveAudioSettings();
}

// Atualizar botão de áudio
function updateAudioButton() {
    const audioBtn = document.getElementById('audio-btn');
    if (audioSystem.enabled) {
        audioBtn.textContent = '🔊';
        audioBtn.classList.remove('muted');
        audioBtn.title = 'Desativar Som';
    } else {
        audioBtn.textContent = '🔇';
        audioBtn.classList.add('muted');
        audioBtn.title = 'Ativar Som';
    }
}

// Salvar configurações de áudio
function saveAudioSettings() {
    localStorage.setItem('reino-audio', JSON.stringify({
        enabled: audioSystem.enabled,
        volume: audioSystem.volume
    }));
}

// Tocar som de decisão
function playDecisionSound(isPositive = true) {
    if (isPositive) {
        playSound('decision');
    } else {
        playSound('error');
    }
}

// Tocar som de conquista
function playAchievementSound(rarity = 'common') {
    switch (rarity) {
        case 'legendary':
            playSound('achievement');
            setTimeout(() => playSound('achievement'), 200);
            break;
        case 'epic':
            playSound('achievement');
            break;
        default:
            playSound('success');
    }
}

// Tocar som de game over
function playGameOverSound() {
    playSound('gameOver');
}

// Tocar som de mudança de ano
function playYearChangeSound() {
    playSound('yearChange');
}

// Tocar som de poder crítico
function playCriticalPowerSound() {
    playSound('powerCritical');
}

// Tocar som de virar carta
function playCardFlipSound() {
    playSound('cardFlip');
}

// === SISTEMA DE TEMAS ===

// Sistema de temas
let themeSystem = {
    currentTheme: 'light',
    themes: {
        light: {
            name: 'Claro',
            icon: '🌙',
            class: ''
        },
        dark: {
            name: 'Escuro',
            icon: '☀️',
            class: 'dark-theme'
        }
    }
};

// Inicializar sistema de temas
function initThemeSystem() {
    // Carregar tema salvo
    const savedTheme = localStorage.getItem('reino-theme');
    if (savedTheme && themeSystem.themes[savedTheme]) {
        themeSystem.currentTheme = savedTheme;
    } else {
        // Detectar preferência do sistema
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            themeSystem.currentTheme = 'dark';
        }
    }
    
    applyTheme(themeSystem.currentTheme);
    updateThemeButton();
}

// Aplicar tema
function applyTheme(themeName) {
    const theme = themeSystem.themes[themeName];
    if (!theme) return;
    
    // Remover todas as classes de tema
    Object.values(themeSystem.themes).forEach(t => {
        if (t.class) {
            document.body.classList.remove(t.class);
        }
    });
    
    // Aplicar nova classe de tema
    if (theme.class) {
        document.body.classList.add(theme.class);
    }
    
    themeSystem.currentTheme = themeName;
}

// Alternar tema
function toggleTheme() {
    const newTheme = themeSystem.currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    updateThemeButton();
    saveThemePreference();
    
    // Efeito sonoro
    playSound('success');
    
    // Efeito visual
    const themeBtn = document.getElementById('theme-btn');
    pulseElement(themeBtn, 1000);
}

// Atualizar botão de tema
function updateThemeButton() {
    const themeBtn = document.getElementById('theme-btn');
    const currentTheme = themeSystem.themes[themeSystem.currentTheme];
    
    themeBtn.textContent = currentTheme.icon;
    themeBtn.title = `Alternar para modo ${themeSystem.currentTheme === 'light' ? 'escuro' : 'claro'}`;
    
    // Atualizar classe do botão
    if (themeSystem.currentTheme === 'light') {
        themeBtn.classList.add('light-mode');
    } else {
        themeBtn.classList.remove('light-mode');
    }
}

// Salvar preferência de tema
function saveThemePreference() {
    localStorage.setItem('reino-theme', themeSystem.currentTheme);
}

// Detectar mudanças na preferência do sistema
function setupThemeDetection() {
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addListener((e) => {
            // Só aplicar se não houver preferência salva
            if (!localStorage.getItem('reino-theme')) {
                const newTheme = e.matches ? 'dark' : 'light';
                applyTheme(newTheme);
                updateThemeButton();
            }
        });
    }
}

// === SISTEMA DE DIFICULDADE ADAPTATIVA ===

// Sistema de dificuldade
let difficultySystem = {
    level: 'normal',
    factors: {
        easy: {
            effectMultiplier: 0.7,
            criticalThreshold: 15,
            balanceBonus: 1.3
        },
        normal: {
            effectMultiplier: 1.0,
            criticalThreshold: 10,
            balanceBonus: 1.0
        },
        hard: {
            effectMultiplier: 1.3,
            criticalThreshold: 5,
            balanceBonus: 0.7
        }
    },
    adaptiveEnabled: true
};

// Calcular dificuldade baseada na performance
function calculateAdaptiveDifficulty() {
    if (!difficultySystem.adaptiveEnabled) return;
    
    const stats = statsSystem.data;
    const currentReign = gameState.currentReignData;
    
    // Fatores para determinar dificuldade
    const avgReignLength = stats.reignHistory.length > 0 ? 
        stats.reignHistory.reduce((sum, reign) => sum + reign.years, 0) / stats.reignHistory.length : 0;
    
    const currentBalance = calculateBalance();
    const recentFailures = stats.reignHistory.slice(-3).filter(reign => reign.years < 10).length;
    
    // Lógica adaptativa
    if (avgReignLength < 15 || recentFailures >= 2 || currentBalance < 0.3) {
        // Jogador está com dificuldades - facilitar
        if (difficultySystem.level !== 'easy') {
            difficultySystem.level = 'easy';
            showDifficultyNotification('Dificuldade ajustada para Fácil');
        }
    } else if (avgReignLength > 30 && currentBalance > 0.7 && recentFailures === 0) {
        // Jogador está indo muito bem - dificultar
        if (difficultySystem.level !== 'hard') {
            difficultySystem.level = 'hard';
            showDifficultyNotification('Dificuldade ajustada para Difícil');
        }
    } else {
        // Manter normal
        if (difficultySystem.level !== 'normal') {
            difficultySystem.level = 'normal';
            showDifficultyNotification('Dificuldade ajustada para Normal');
        }
    }
}

// Aplicar modificadores de dificuldade aos efeitos
function applyDifficultyModifiers(effects) {
    const difficulty = difficultySystem.factors[difficultySystem.level];
    const modifiedEffects = {};
    
    Object.entries(effects).forEach(([power, value]) => {
        modifiedEffects[power] = Math.round(value * difficulty.effectMultiplier);
    });
    
    return modifiedEffects;
}

// Mostrar notificação de mudança de dificuldade
function showDifficultyNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'difficulty-notification';
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(145deg, #3b82f6, #2563eb);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 1500;
        transform: translateX(400px);
        transition: transform 0.5s ease;
        font-weight: bold;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 3000);
}

// === SISTEMA DE TOOLTIPS ===

// Sistema de tooltips
let tooltipSystem = {
    currentTooltip: null,
    showDelay: 500,
    hideDelay: 100
};

// Inicializar sistema de tooltips
function initTooltipSystem() {
    document.querySelectorAll('[data-tooltip]').forEach(element => {
        let showTimeout, hideTimeout;
        
        element.addEventListener('mouseenter', (e) => {
            clearTimeout(hideTimeout);
            showTimeout = setTimeout(() => {
                showTooltip(e.target, e.target.dataset.tooltip);
            }, tooltipSystem.showDelay);
        });
        
        element.addEventListener('mouseleave', () => {
            clearTimeout(showTimeout);
            hideTimeout = setTimeout(() => {
                hideTooltip();
            }, tooltipSystem.hideDelay);
        });
        
        element.addEventListener('click', () => {
            hideTooltip();
        });
    });
}

// Mostrar tooltip
function showTooltip(element, text) {
    hideTooltip(); // Esconder tooltip anterior
    
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = text;
    
    document.body.appendChild(tooltip);
    tooltipSystem.currentTooltip = tooltip;
    
    // Posicionar tooltip
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.top - tooltipRect.height - 10;
    
    // Ajustar se sair da tela
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
    }
    
    if (top < 10) {
        top = rect.bottom + 10;
        tooltip.style.transform = 'translateY(-10px)';
        // Inverter seta
        tooltip.style.setProperty('--arrow-direction', 'up');
    }
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    
    // Animar entrada
    requestAnimationFrame(() => {
        tooltip.classList.add('show');
    });
}

// Esconder tooltip
function hideTooltip() {
    if (tooltipSystem.currentTooltip) {
        tooltipSystem.currentTooltip.classList.remove('show');
        setTimeout(() => {
            if (tooltipSystem.currentTooltip && tooltipSystem.currentTooltip.parentNode) {
                tooltipSystem.currentTooltip.parentNode.removeChild(tooltipSystem.currentTooltip);
            }
            tooltipSystem.currentTooltip = null;
        }, 300);
    }
}

// === SISTEMA DE TUTORIAL INTERATIVO ===

// Sistema de tutorial
let tutorialSystem = {
    isActive: false,
    currentStep: 0,
    steps: [
        {
            target: '.power-bars',
            title: '👑 Bem-vindo ao Reino!',
            text: 'Estas são as 4 barras de poder do seu reino. Mantenha-as equilibradas para sobreviver!',
            position: 'bottom'
        },
        {
            target: '.card',
            title: '📜 Cartas de Eventos',
            text: 'Cada carta apresenta uma situação que requer sua decisão como governante.',
            position: 'bottom'
        },
        {
            target: '.decision-buttons',
            title: '⚖️ Tome Decisões',
            text: 'Escolha entre duas opções. Cada decisão afeta seus poderes de forma diferente.',
            position: 'top'
        },
        {
            target: '.game-controls',
            title: '🎮 Controles',
            text: 'Use estes botões para alternar tema, som e ver suas estatísticas.',
            position: 'top'
        },
        {
            target: '.turn-counter',
            title: '📅 Objetivo',
            text: 'Sobreviva o máximo de anos possível! Se algum poder chegar a 0 ou 100, é game over.',
            position: 'bottom'
        }
    ]
};

// Iniciar tutorial
function startTutorial() {
    if (localStorage.getItem('reino-tutorial-completed')) {
        return; // Tutorial já foi completado
    }
    
    tutorialSystem.isActive = true;
    tutorialSystem.currentStep = 0;
    showTutorialStep();
}

// Mostrar passo do tutorial
function showTutorialStep() {
    const step = tutorialSystem.steps[tutorialSystem.currentStep];
    if (!step) {
        completeTutorial();
        return;
    }
    
    const target = document.querySelector(step.target);
    if (!target) {
        nextTutorialStep();
        return;
    }
    
    // Criar overlay
    const overlay = document.createElement('div');
    overlay.className = 'tutorial-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 3000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Criar modal do tutorial
    const modal = document.createElement('div');
    modal.className = 'tutorial-modal';
    modal.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 30px;
        max-width: 400px;
        margin: 20px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        text-align: center;
        position: relative;
    `;
    
    modal.innerHTML = `
        <h3 style="margin: 0 0 15px 0; font-family: 'Playfair Display', serif; font-size: 1.5em; color: #1e293b;">${step.title}</h3>
        <p style="margin: 0 0 25px 0; color: #475569; line-height: 1.6;">${step.text}</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button class="tutorial-skip" style="padding: 10px 20px; border: 2px solid #e2e8f0; background: white; color: #64748b; border-radius: 8px; cursor: pointer; font-weight: 500;">Pular Tutorial</button>
            <button class="tutorial-next" style="padding: 10px 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Próximo (${tutorialSystem.currentStep + 1}/${tutorialSystem.steps.length})</button>
        </div>
    `;
    
    // Event listeners
    modal.querySelector('.tutorial-skip').addEventListener('click', () => {
        completeTutorial();
        document.body.removeChild(overlay);
    });
    
    modal.querySelector('.tutorial-next').addEventListener('click', () => {
        document.body.removeChild(overlay);
        nextTutorialStep();
    });
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Destacar elemento alvo
    target.style.position = 'relative';
    target.style.zIndex = '3001';
    target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.5)';
    target.style.borderRadius = '12px';
    
    // Limpar destaque após um tempo
    setTimeout(() => {
        if (target) {
            target.style.position = '';
            target.style.zIndex = '';
            target.style.boxShadow = '';
            target.style.borderRadius = '';
        }
    }, 5000);
}

// Próximo passo do tutorial
function nextTutorialStep() {
    tutorialSystem.currentStep++;
    setTimeout(() => {
        showTutorialStep();
    }, 500);
}

// Completar tutorial
function completeTutorial() {
    tutorialSystem.isActive = false;
    localStorage.setItem('reino-tutorial-completed', 'true');
    
    // Mostrar mensagem de conclusão
    showAchievementNotification({
        icon: '🎓',
        name: 'Tutorial Concluído',
        description: 'Agora você está pronto para governar seu reino!'
    });
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    initAudioSystem();
    initThemeSystem();
    setupThemeDetection();
    initTooltipSystem();
    initGame();
    
    // Iniciar tutorial após um delay
    setTimeout(() => {
        startTutorial();
    }, 2000);
});