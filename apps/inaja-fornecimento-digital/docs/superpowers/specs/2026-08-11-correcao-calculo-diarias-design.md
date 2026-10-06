# Correção do cálculo de diárias de viagem

## Contexto

A calculadora atual usa `1 + floor((horas - 24) / 12)` depois das primeiras 24 horas. Essa fórmula conta uma diária adicional a cada 12 horas e, por isso, calcula 48 horas como 3 diárias. O comportamento confirmado é 48 horas = 2 diárias.

## Decisão

Extrair a regra para uma função pura em `src/lib/diarias.ts` e fazer o componente `src/pages/Diarias.tsx` reutilizá-la. A função será coberta por testes unitários em `src/lib/diarias.test.ts`.

## Regra de negócio

- Menos de 12 horas: 0 diárias.
- Cada bloco completo de 24 horas: 1 diária.
- O restante de 12 até menos de 24 horas: mais 1 diária.
- O limite de 24 horas é inclusivo para o primeiro período: 12h e 24h resultam em 1 diária.

Exemplos: 12h → 1, 24h → 1, 36h → 2, 48h → 2 e 60h → 3.

Em termos de algoritmo, após validar a duração, o resultado será `floor(horas / 24)` mais 1 quando `horas % 24 >= 12`. A interface, os valores unitários, o cálculo do total, a fundamentação e o PDF permanecem inalterados além da quantidade corrigida.

## Testes

Adicionar casos unitários para os limites abaixo de 12h, 12h, 24h, 36h, 48h e 60h. O teste de 48h deve falhar antes da implementação e passar depois dela, prevenindo a regressão que motivou a correção.

## Escopo e não escopo

O escopo é somente a contagem de diárias integrais por duração. Não serão alterados pernoites, valores por cargo/destino, validação de datas, textos do PDF ou outras calculadoras.
