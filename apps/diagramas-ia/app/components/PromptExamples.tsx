'use client'

interface PromptExamplesProps {
  onSelectPrompt: (prompt: string) => void
}

const examplePrompts = [
  {
    title: "Processo de Login",
    prompt: "Crie um fluxograma para processo de login de usuário com validação de credenciais, tratamento de erro e redirecionamento após sucesso"
  },
  {
    title: "Workflow de Aprovação",
    prompt: "Diagrama de workflow para aprovação de documentos com múltiplos níveis hierárquicos e possibilidade de rejeição"
  },
  {
    title: "Sistema de E-commerce",
    prompt: "Fluxograma do processo de compra online desde a seleção do produto até a confirmação do pagamento"
  },
  {
    title: "Processo de Onboarding",
    prompt: "Diagrama do processo de integração de novos funcionários com etapas de documentação, treinamento e avaliação"
  },
  {
    title: "Sistema de Suporte",
    prompt: "Fluxograma para atendimento ao cliente com categorização de tickets, escalação e resolução"
  },
  {
    title: "Processo de Deploy",
    prompt: "Diagrama do pipeline de deploy de software com testes, validações e rollback em caso de erro"
  }
]

export default function PromptExamples({ onSelectPrompt }: PromptExamplesProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700 mb-3">
        Exemplos:
      </h4>
      <div className="grid grid-cols-1 gap-2">
        {examplePrompts.map((example, index) => (
          <button
            key={index}
            onClick={() => onSelectPrompt(example.prompt)}
            className="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary transition-colors"
          >
            <div className="font-medium text-sm text-gray-900 mb-1">
              {example.title}
            </div>
            <div className="text-xs text-gray-600 line-clamp-2">
              {example.prompt}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}