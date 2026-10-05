import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

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

    const enhancedPrompt = `
    Você é um especialista em criação de diagramas e fluxogramas. 
    Baseado na seguinte solicitação, forneça sugestões detalhadas sobre:
    1. Estrutura do diagrama
    2. Elementos necessários (retângulos, círculos, losangos)
    3. Conexões entre elementos
    4. Texto para cada elemento
    5. Layout sugerido

    Solicitação do usuário: ${prompt}

    Responda de forma clara e estruturada, focando em aspectos práticos para criação do diagrama.
    `

    const result = await model.generateContent(enhancedPrompt)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error('Erro na API do Gemini:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}