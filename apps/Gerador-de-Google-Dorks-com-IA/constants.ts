
export const dorks = [
  {
    operator: 'site:',
    description: 'Restringe a busca a um site ou domínio específico. Ex: site:gov.br',
  },
  {
    operator: 'filetype:',
    description: 'Busca por tipos de arquivo específicos. Ex: filetype:pdf',
  },
  {
    operator: 'inurl:',
    description: 'Encontra páginas com uma string específica na URL. Ex: inurl:admin',
  },
  {
    operator: 'intitle:',
    description: 'Busca por páginas com uma palavra no título. Ex: intitle:"index of"',
  },
  {
    operator: 'intext:',
    description: 'Encontra páginas com texto específico no corpo. Ex: intext:"password"',
  },
  {
    operator: '" "',
    description: 'Força a busca pela frase exata. Ex: "relatório financeiro"',
  },
  {
    operator: '*',
    description: 'Atua como um curinga para qualquer palavra. Ex: "maiores * do mundo"',
  },
];
