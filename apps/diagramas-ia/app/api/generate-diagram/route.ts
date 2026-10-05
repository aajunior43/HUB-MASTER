import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

interface DiagramNode {
    id: string
    type: 'custom'
    position: { x: number; y: number }
    data: {
        label: string
        type: 'rectangle' | 'circle' | 'diamond'
    }
}

interface DiagramEdge {
    id: string
    source: string
    target: string
    type?: 'default'
    animated?: boolean
}

interface DiagramData {
    nodes: DiagramNode[]
    edges: DiagramEdge[]
}

export async function POST(request: NextRequest) {
    try {
        const { prompt, currentDiagram, errorDetails, config } = await request.json()

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt é obrigatório' },
                { status: 400 }
            )
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'Chave da API do Gemini não configurada' },
                { status: 500 }
            )
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        // Se há um diagrama atual com erro, tentar corrigi-lo
        if (currentDiagram && errorDetails) {
            console.log('Tentando corrigir diagrama com erro:', errorDetails)
            return await attemptDiagramCorrection(model, prompt, currentDiagram, errorDetails)
        }

        // Geração normal do diagrama com sistema de retry automático
        return await generateDiagramWithAutoCorrection(model, prompt, 3, config)

    } catch (error) {
        console.error('Erro na API de geração de diagrama:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}

async function generateDiagramWithAutoCorrection(model: any, prompt: string, maxRetries: number = 3, config?: any) {
    let lastError = null
    let attempt = 0

    while (attempt < maxRetries) {
        attempt++
        console.log(`Tentativa ${attempt} de ${maxRetries}`)

        try {
            const enhancedPrompt = createEnhancedPrompt(prompt, lastError, attempt, config)
            const result = await model.generateContent(enhancedPrompt)
            const response = result.response
            const text = response.text()

            console.log(`Resposta do Gemini (tentativa ${attempt}):`, text)

            const diagramData = await processDiagramResponse(text, prompt)
            
            // Validar o diagrama gerado
            const validationResult = validateDiagram(diagramData)
            
            if (validationResult.isValid) {
                console.log(`Diagrama válido gerado na tentativa ${attempt}`)
                return NextResponse.json({
                    diagram: diagramData,
                    suggestion: `Diagrama gerado com base em: "${prompt}"`,
                    correctionAttempts: attempt,
                    autoFixed: attempt > 1
                })
            } else {
                lastError = validationResult.errors.join(', ')
                console.log(`Diagrama inválido na tentativa ${attempt}:`, lastError)
                
                if (attempt === maxRetries) {
                    // Última tentativa falhou, usar fallback
                    console.log('Todas as tentativas falharam, usando diagrama fallback')
                    const fallbackDiagram = createFallbackDiagram(prompt)
                    return NextResponse.json({
                        diagram: fallbackDiagram,
                        suggestion: `Diagrama de fallback gerado para: "${prompt}"`,
                        correctionAttempts: attempt,
                        autoFixed: true,
                        fallbackUsed: true
                    })
                }
            }
        } catch (error) {
            lastError = error instanceof Error ? error.message : 'Erro desconhecido'
            console.error(`Erro na tentativa ${attempt}:`, error)
            
            if (attempt === maxRetries) {
                const fallbackDiagram = createFallbackDiagram(prompt)
                return NextResponse.json({
                    diagram: fallbackDiagram,
                    suggestion: `Diagrama de fallback gerado após erro: "${prompt}"`,
                    correctionAttempts: attempt,
                    autoFixed: true,
                    fallbackUsed: true
                })
            }
        }
    }
}

async function attemptDiagramCorrection(model: any, originalPrompt: string, currentDiagram: DiagramData, errorDetails: string) {
    console.log('Iniciando correção automática do diagrama')
    
    const correctionPrompt = `
Você é um especialista em correção de diagramas. Um diagrama foi gerado mas apresentou o seguinte erro:

ERRO DETECTADO: ${errorDetails}

DIAGRAMA ATUAL COM PROBLEMA:
${JSON.stringify(currentDiagram, null, 2)}

PROMPT ORIGINAL: ${originalPrompt}

Sua tarefa é corrigir o diagrama mantendo a intenção original mas resolvendo o erro.

RESPONDA APENAS COM UM JSON VÁLIDO corrigido, sem explicações:

{
  "nodes": [...],
  "edges": [...]
}

REGRAS DE CORREÇÃO:
- Mantenha a estrutura e fluxo lógico original
- Corrija apenas o que está causando o erro
- Garanta que todos os IDs sejam únicos
- Verifique se todas as conexões (edges) referenciam nós existentes
- Use posicionamento adequado (espaçamento de 150px)
- Mantenha labels claros e descritivos

JSON CORRIGIDO:`

    try {
        const result = await model.generateContent(correctionPrompt)
        const response = result.response
        const text = response.text()

        console.log('Resposta da correção:', text)

        const correctedDiagram = await processDiagramResponse(text, originalPrompt)
        const validationResult = validateDiagram(correctedDiagram)

        if (validationResult.isValid) {
            return NextResponse.json({
                diagram: correctedDiagram,
                suggestion: `Diagrama corrigido automaticamente: "${originalPrompt}"`,
                correctionAttempts: 1,
                autoFixed: true,
                errorFixed: errorDetails
            })
        } else {
            // Se a correção falhou, usar fallback
            console.log('Correção automática falhou, usando fallback')
            const fallbackDiagram = createFallbackDiagram(originalPrompt)
            return NextResponse.json({
                diagram: fallbackDiagram,
                suggestion: `Diagrama de fallback após falha na correção: "${originalPrompt}"`,
                correctionAttempts: 1,
                autoFixed: true,
                fallbackUsed: true,
                originalError: errorDetails
            })
        }
    } catch (error) {
        console.error('Erro na correção automática:', error)
        const fallbackDiagram = createFallbackDiagram(originalPrompt)
        return NextResponse.json({
            diagram: fallbackDiagram,
            suggestion: `Diagrama de fallback após erro na correção: "${originalPrompt}"`,
            correctionAttempts: 1,
            autoFixed: true,
            fallbackUsed: true,
            originalError: errorDetails
        })
    }
}

function createEnhancedPrompt(prompt: string, lastError: string | null, attempt: number, config?: any): string {
    let enhancedPrompt = `
Você é um especialista em criação de diagramas e fluxogramas. 
Crie um diagrama baseado na solicitação do usuário.

RESPONDA APENAS COM UM JSON VÁLIDO, sem explicações ou texto adicional.`

    // Adicionar configurações específicas se fornecidas
    if (config && !config.autoMode) {
        enhancedPrompt += `

CONFIGURAÇÕES ESPECÍFICAS:
- Complexidade: ${config.complexity} (simple = 3-5 nós, medium = 6-10 nós, complex = 11+ nós)
- Formato: ${config.format}
- Estilo: ${config.style}
- Incluir rótulos detalhados: ${config.includeLabels ? 'sim' : 'não'}
- Mostrar conexões: ${config.showConnections ? 'sim' : 'não'}

INSTRUÇÕES DE FORMATO:
${getFormatInstructions(config.format)}

INSTRUÇÕES DE ESTILO:
${getStyleInstructions(config.style)}`
    } else if (config && config.autoMode) {
        enhancedPrompt += `

MODO AUTOMÁTICO ATIVADO:
Analise o prompt e escolha automaticamente:
- A melhor complexidade (simple/medium/complex)
- O formato mais adequado (flowchart/mindmap/sequence/class/er/gantt)
- O estilo visual mais apropriado (modern/classic/minimal/colorful)
- Se deve incluir rótulos detalhados
- Se deve mostrar conexões extras

Otimize todas as configurações para melhor representar a solicitação do usuário.`
    }

    if (lastError && attempt > 1) {
        enhancedPrompt += `

ATENÇÃO: A tentativa anterior falhou com o erro: "${lastError}"
Por favor, corrija este problema na nova tentativa.`
    }

    enhancedPrompt += `

Estrutura obrigatória:
{
  "nodes": [
    {
      "id": "1",
      "type": "custom",
      "position": {"x": 250, "y": 100},
      "data": {
        "label": "Início",
        "type": "circle"
      }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "1",
      "target": "2"
    }
  ]
}

REGRAS IMPORTANTES:
- Use "circle" para início/fim
- Use "rectangle" para processos/ações
- Use "diamond" para decisões
- Posicione nós com espaçamento de 150px vertical
- IDs devem ser strings simples: "1", "2", "3"
- Edge IDs formato: "e1-2" (source-target)
- Labels devem ser claros e concisos
- TODOS os IDs devem ser únicos
- TODAS as edges devem referenciar nós existentes

Solicitação: ${prompt}

JSON:`

    return enhancedPrompt
}

async function processDiagramResponse(text: string, prompt: string): Promise<DiagramData> {
    // Limpar a resposta
    let cleanText = text.trim()

    // Remover possíveis marcadores de código
    cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '')

    // Procurar por JSON válido na resposta
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
        cleanText = jsonMatch[0]
    }

    console.log('Texto limpo para parse:', cleanText)

    const diagramData = JSON.parse(cleanText)

    // Validar e corrigir estrutura básica
    if (!diagramData.nodes || !Array.isArray(diagramData.nodes)) {
        throw new Error('Estrutura de nós inválida')
    }

    if (!diagramData.edges) {
        diagramData.edges = []
    }

    if (!Array.isArray(diagramData.edges)) {
        diagramData.edges = []
    }

    // Validar e corrigir cada nó
    diagramData.nodes = diagramData.nodes.map((node, index) => {
        if (!node.id) {
            node.id = String(index + 1)
        }
        if (!node.type) {
            node.type = 'custom'
        }
        if (!node.position) {
            node.position = { x: 250, y: 100 + (index * 150) }
        }
        if (!node.data) {
            node.data = { label: `Nó ${index + 1}`, type: 'rectangle' }
        }
        if (!node.data.type || !['rectangle', 'circle', 'diamond'].includes(node.data.type)) {
            node.data.type = 'rectangle'
        }
        if (!node.data.label) {
            node.data.label = `Nó ${index + 1}`
        }
        return node
    })

    // Validar edges
    diagramData.edges = diagramData.edges.filter(edge =>
        edge.source && edge.target && edge.id
    )

    return diagramData
}

function validateDiagram(diagram: DiagramData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Verificar se há nós
    if (!diagram.nodes || diagram.nodes.length === 0) {
        errors.push('Diagrama deve ter pelo menos um nó')
    }

    // Verificar IDs únicos dos nós
    const nodeIds = new Set()
    diagram.nodes.forEach(node => {
        if (nodeIds.has(node.id)) {
            errors.push(`ID de nó duplicado: ${node.id}`)
        }
        nodeIds.add(node.id)
    })

    // Verificar se edges referenciam nós existentes
    diagram.edges.forEach(edge => {
        if (!nodeIds.has(edge.source)) {
            errors.push(`Edge referencia nó inexistente como source: ${edge.source}`)
        }
        if (!nodeIds.has(edge.target)) {
            errors.push(`Edge referencia nó inexistente como target: ${edge.target}`)
        }
    })

    // Verificar IDs únicos das edges
    const edgeIds = new Set()
    diagram.edges.forEach(edge => {
        if (edgeIds.has(edge.id)) {
            errors.push(`ID de edge duplicado: ${edge.id}`)
        }
        edgeIds.add(edge.id)
    })

    return {
        isValid: errors.length === 0,
        errors
    }
}

function createFallbackDiagram(prompt: string): DiagramData {
    const words = prompt.toLowerCase()

    // Login/Autenticação
    if (words.includes('login') || words.includes('autenticação') || words.includes('autenticar')) {
        return {
            nodes: [
                { id: '1', type: 'custom', position: { x: 250, y: 50 }, data: { label: 'Início', type: 'circle' } },
                { id: '2', type: 'custom', position: { x: 250, y: 150 }, data: { label: 'Inserir Credenciais', type: 'rectangle' } },
                { id: '3', type: 'custom', position: { x: 250, y: 250 }, data: { label: 'Validar Credenciais', type: 'rectangle' } },
                { id: '4', type: 'custom', position: { x: 250, y: 350 }, data: { label: 'Credenciais Válidas?', type: 'diamond' } },
                { id: '5', type: 'custom', position: { x: 400, y: 450 }, data: { label: 'Acesso Liberado', type: 'rectangle' } },
                { id: '6', type: 'custom', position: { x: 100, y: 450 }, data: { label: 'Mostrar Erro', type: 'rectangle' } },
                { id: '7', type: 'custom', position: { x: 400, y: 550 }, data: { label: 'Fim', type: 'circle' } }
            ],
            edges: [
                { id: 'e1-2', source: '1', target: '2' },
                { id: 'e2-3', source: '2', target: '3' },
                { id: 'e3-4', source: '3', target: '4' },
                { id: 'e4-5', source: '4', target: '5' },
                { id: 'e4-6', source: '4', target: '6' },
                { id: 'e5-7', source: '5', target: '7' },
                { id: 'e6-2', source: '6', target: '2' }
            ]
        }
    }

    // E-commerce/Compra
    if (words.includes('compra') || words.includes('ecommerce') || words.includes('e-commerce') || words.includes('pedido')) {
        return {
            nodes: [
                { id: '1', type: 'custom', position: { x: 250, y: 50 }, data: { label: 'Início', type: 'circle' } },
                { id: '2', type: 'custom', position: { x: 250, y: 150 }, data: { label: 'Selecionar Produto', type: 'rectangle' } },
                { id: '3', type: 'custom', position: { x: 250, y: 250 }, data: { label: 'Adicionar ao Carrinho', type: 'rectangle' } },
                { id: '4', type: 'custom', position: { x: 250, y: 350 }, data: { label: 'Finalizar Compra', type: 'rectangle' } },
                { id: '5', type: 'custom', position: { x: 250, y: 450 }, data: { label: 'Processar Pagamento', type: 'rectangle' } },
                { id: '6', type: 'custom', position: { x: 250, y: 550 }, data: { label: 'Confirmar Pedido', type: 'rectangle' } },
                { id: '7', type: 'custom', position: { x: 250, y: 650 }, data: { label: 'Fim', type: 'circle' } }
            ],
            edges: [
                { id: 'e1-2', source: '1', target: '2' },
                { id: 'e2-3', source: '2', target: '3' },
                { id: 'e3-4', source: '3', target: '4' },
                { id: 'e4-5', source: '4', target: '5' },
                { id: 'e5-6', source: '5', target: '6' },
                { id: 'e6-7', source: '6', target: '7' }
            ]
        }
    }

    // Aprovação/Workflow
    if (words.includes('aprovação') || words.includes('aprovar') || words.includes('workflow')) {
        return {
            nodes: [
                { id: '1', type: 'custom', position: { x: 250, y: 50 }, data: { label: 'Início', type: 'circle' } },
                { id: '2', type: 'custom', position: { x: 250, y: 150 }, data: { label: 'Submeter Solicitação', type: 'rectangle' } },
                { id: '3', type: 'custom', position: { x: 250, y: 250 }, data: { label: 'Revisar Documento', type: 'rectangle' } },
                { id: '4', type: 'custom', position: { x: 250, y: 350 }, data: { label: 'Aprovado?', type: 'diamond' } },
                { id: '5', type: 'custom', position: { x: 400, y: 450 }, data: { label: 'Documento Aprovado', type: 'rectangle' } },
                { id: '6', type: 'custom', position: { x: 100, y: 450 }, data: { label: 'Solicitar Correções', type: 'rectangle' } },
                { id: '7', type: 'custom', position: { x: 400, y: 550 }, data: { label: 'Fim', type: 'circle' } }
            ],
            edges: [
                { id: 'e1-2', source: '1', target: '2' },
                { id: 'e2-3', source: '2', target: '3' },
                { id: 'e3-4', source: '3', target: '4' },
                { id: 'e4-5', source: '4', target: '5' },
                { id: 'e4-6', source: '4', target: '6' },
                { id: 'e5-7', source: '5', target: '7' },
                { id: 'e6-2', source: '6', target: '2' }
            ]
        }
    }

    // Diagrama genérico baseado no prompt
    const steps = extractStepsFromPrompt(prompt)
    return createGenericDiagram(steps)
}

function extractStepsFromPrompt(prompt: string): string[] {
    // Tentar extrair etapas do prompt
    const words = prompt.split(/[,.\n]/).map(s => s.trim()).filter(s => s.length > 0)

    if (words.length <= 1) {
        return ['Início', 'Processo Principal', 'Fim']
    }

    // Pegar as primeiras palavras como etapas
    const steps = ['Início']
    words.slice(0, Math.min(4, words.length)).forEach((word, index) => {
        if (word.length > 3) {
            steps.push(word.charAt(0).toUpperCase() + word.slice(1))
        }
    })
    steps.push('Fim')

    return steps
}

function createGenericDiagram(steps: string[]): DiagramData {
    const nodes = steps.map((step, index) => ({
        id: String(index + 1),
        type: 'custom' as const,
        position: { x: 250, y: 50 + (index * 150) },
        data: {
            label: step,
            type: (index === 0 || index === steps.length - 1) ? 'circle' as const : 'rectangle' as const
        }
    }))

    const edges = []
    for (let i = 0; i < steps.length - 1; i++) {
        edges.push({
            id: `e${i + 1}-${i + 2}`,
            source: String(i + 1),
            target: String(i + 2)
        })
    }

    return { nodes, edges }
}

function getFormatInstructions(format: string): string {
    switch (format) {
        case 'flowchart':
            return `
- Use fluxo sequencial com decisões (diamond) quando necessário
- Início e fim com círculos
- Processos com retângulos
- Decisões com diamantes`
        
        case 'mindmap':
            return `
- Nó central principal
- Ramificações radiais a partir do centro
- Subnós conectados aos ramos principais
- Estrutura hierárquica`
        
        case 'sequence':
            return `
- Atores/entidades como nós principais
- Fluxo temporal da esquerda para direita
- Interações sequenciais entre entidades`
        
        case 'class':
            return `
- Classes como retângulos
- Relacionamentos entre classes
- Herança e composição quando aplicável`
        
        case 'er':
            return `
- Entidades como retângulos
- Relacionamentos como diamantes
- Atributos conectados às entidades`
        
        case 'gantt':
            return `
- Tarefas como retângulos
- Dependências temporais
- Marcos como círculos`
        
        default:
            return 'Use o formato mais adequado para representar a informação'
    }
}

function getStyleInstructions(style: string): string {
    switch (style) {
        case 'modern':
            return `
- Labels concisos e modernos
- Estrutura limpa e organizada
- Foco na clareza visual`
        
        case 'classic':
            return `
- Labels formais e descritivos
- Estrutura tradicional
- Terminologia técnica quando apropriada`
        
        case 'minimal':
            return `
- Labels extremamente concisos
- Apenas elementos essenciais
- Máxima simplicidade`
        
        case 'colorful':
            return `
- Labels descritivos e expressivos
- Variedade de tipos de nós
- Estrutura rica em detalhes`
        
        default:
            return 'Use estilo equilibrado entre clareza e detalhamento'
    }
}