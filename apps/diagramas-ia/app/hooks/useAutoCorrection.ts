import { useState, useCallback } from 'react'
import { Node, Edge } from 'reactflow'

interface DiagramData {
    nodes: Node[]
    edges: Edge[]
}

interface AutoCorrectionResult {
    diagram: DiagramData
    suggestion: string
    correctionAttempts?: number
    autoFixed?: boolean
    fallbackUsed?: boolean
    errorFixed?: string
    originalError?: string
}

interface AutoCorrectionHook {
    isGenerating: boolean
    error: string | null
    generateDiagram: (prompt: string) => Promise<DiagramData | null>
    correctDiagram: (prompt: string, currentDiagram: DiagramData, errorDetails: string) => Promise<DiagramData | null>
    lastResult: AutoCorrectionResult | null
}

export function useAutoCorrection(): AutoCorrectionHook {
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastResult, setLastResult] = useState<AutoCorrectionResult | null>(null)

    const generateDiagram = useCallback(async (prompt: string): Promise<DiagramData | null> => {
        setIsGenerating(true)
        setError(null)

        try {
            const response = await fetch('/api/generate-diagram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Erro ao gerar diagrama')
            }

            const result: AutoCorrectionResult = await response.json()
            setLastResult(result)

            // Log informações sobre correções automáticas
            if (result.autoFixed) {
                console.log(`✅ Diagrama corrigido automaticamente após ${result.correctionAttempts} tentativas`)
                if (result.fallbackUsed) {
                    console.log('⚠️ Diagrama de fallback foi usado')
                }
                if (result.errorFixed) {
                    console.log(`🔧 Erro corrigido: ${result.errorFixed}`)
                }
            }

            return result.diagram
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
            setError(errorMessage)
            console.error('Erro na geração do diagrama:', err)
            return null
        } finally {
            setIsGenerating(false)
        }
    }, [])

    const correctDiagram = useCallback(async (
        prompt: string, 
        currentDiagram: DiagramData, 
        errorDetails: string
    ): Promise<DiagramData | null> => {
        setIsGenerating(true)
        setError(null)

        try {
            console.log('🔄 Iniciando correção automática do diagrama...')
            
            const response = await fetch('/api/generate-diagram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    prompt, 
                    currentDiagram, 
                    errorDetails 
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Erro ao corrigir diagrama')
            }

            const result: AutoCorrectionResult = await response.json()
            setLastResult(result)

            console.log('✅ Correção automática concluída')
            if (result.errorFixed) {
                console.log(`🔧 Erro corrigido: ${result.errorFixed}`)
            }
            if (result.fallbackUsed) {
                console.log('⚠️ Diagrama de fallback foi usado após falha na correção')
            }

            return result.diagram
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
            setError(errorMessage)
            console.error('Erro na correção do diagrama:', err)
            return null
        } finally {
            setIsGenerating(false)
        }
    }, [])

    return {
        isGenerating,
        error,
        generateDiagram,
        correctDiagram,
        lastResult
    }
}

// Hook para detectar erros no diagrama
export function useDiagramValidation() {
    const validateDiagram = useCallback((nodes: Node[], edges: Edge[]): { isValid: boolean; errors: string[] } => {
        const errors: string[] = []

        // Verificar se há nós
        if (!nodes || nodes.length === 0) {
            errors.push('Diagrama deve ter pelo menos um nó')
            return { isValid: false, errors }
        }

        // Verificar IDs únicos dos nós
        const nodeIds = new Set()
        const duplicateNodeIds = new Set()
        
        nodes.forEach(node => {
            if (nodeIds.has(node.id)) {
                duplicateNodeIds.add(node.id)
                errors.push(`ID de nó duplicado: ${node.id}`)
            }
            nodeIds.add(node.id)
        })

        // Verificar se edges referenciam nós existentes
        edges.forEach(edge => {
            if (!nodeIds.has(edge.source)) {
                errors.push(`Conexão referencia nó inexistente como origem: ${edge.source}`)
            }
            if (!nodeIds.has(edge.target)) {
                errors.push(`Conexão referencia nó inexistente como destino: ${edge.target}`)
            }
        })

        // Verificar IDs únicos das edges
        const edgeIds = new Set()
        const duplicateEdgeIds = new Set()
        
        edges.forEach(edge => {
            if (edgeIds.has(edge.id)) {
                duplicateEdgeIds.add(edge.id)
                errors.push(`ID de conexão duplicado: ${edge.id}`)
            }
            edgeIds.add(edge.id)
        })

        // Verificar nós órfãos (sem conexões)
        const connectedNodes = new Set()
        edges.forEach(edge => {
            connectedNodes.add(edge.source)
            connectedNodes.add(edge.target)
        })

        const orphanNodes = nodes.filter(node => !connectedNodes.has(node.id) && nodes.length > 1)
        if (orphanNodes.length > 0) {
            errors.push(`Nós sem conexões detectados: ${orphanNodes.map(n => n.id).join(', ')}`)
        }

        // Verificar posicionamento (nós sobrepostos)
        const positions = new Map()
        nodes.forEach(node => {
            const posKey = `${Math.round(node.position.x)},${Math.round(node.position.y)}`
            if (positions.has(posKey)) {
                errors.push(`Nós sobrepostos detectados na posição (${node.position.x}, ${node.position.y})`)
            }
            positions.set(posKey, node.id)
        })

        return {
            isValid: errors.length === 0,
            errors
        }
    }, [])

    return { validateDiagram }
}