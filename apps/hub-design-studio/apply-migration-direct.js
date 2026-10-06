import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://utefgvyfugfahguzwhob.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0ZWZndnlmdWdmYWhndXp3aG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDA4MjAsImV4cCI6MjA3NTQxNjgyMH0.68qxbqPK9gztYH4NEv0HYfD4sMWkQ9HwqLdDbHyB_-k'

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigrationDirect() {
  try {
    console.log('Aplicando migração para múltiplos perfis diretamente...')
    
    // 1. Verificar estrutura atual da tabela
    console.log('1. Verificando estrutura atual da tabela profiles...')
    
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (fetchError) {
      console.error('Erro ao acessar tabela profiles:', fetchError)
      return
    }
    
    console.log('Estrutura atual da tabela:', Object.keys(profiles?.[0] || {}))
    
    // 2. Tentar atualizar perfis existentes com novos campos
    console.log('2. Atualizando perfis existentes...')
    
    // Buscar todos os perfis
    const { data: allProfiles, error: fetchAllError } = await supabase
      .from('profiles')
      .select('*')
    
    if (fetchAllError) {
      console.error('Erro ao buscar todos os perfis:', fetchAllError)
      return
    }
    
    console.log(`Encontrados ${allProfiles?.length || 0} perfis`)
    
    // Tentar atualizar cada perfil com os novos campos
    for (const profile of allProfiles || []) {
      const slug = profile.username.toLowerCase().replace(/[^a-z0-9]/g, '')
      
      // Tentar atualizar com novos campos
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_primary: true, // Por enquanto, marcar todos como primários
          is_active: true,
          profile_slug: slug
        })
        .eq('id', profile.id)
      
      if (updateError) {
        console.log(`Campos novos não existem ainda para perfil ${profile.username}:`, updateError.message)
      } else {
        console.log(`Perfil ${profile.username} atualizado com sucesso`)
      }
    }
    
    console.log('Tentativa de migração concluída!')
    console.log('Se houver erros, as colunas precisam ser adicionadas manualmente no Supabase Dashboard.')
    
  } catch (error) {
    console.error('Erro ao aplicar migração:', error)
  }
}

applyMigrationDirect()