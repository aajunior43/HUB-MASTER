import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = 'https://utefgvyfugfahguzwhob.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0ZWZndnlmdWdmYWhndXp3aG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDA4MjAsImV4cCI6MjA3NTQxNjgyMH0.68qxbqPK9gztYH4NEv0HYfD4sMWkQ9HwqLdDbHyB_-k'

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  try {
    console.log('Aplicando migração para múltiplos perfis...')
    
    // Ler o arquivo de migração
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20251008000000_multiple_profiles_per_user.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Dividir em comandos individuais (separados por ponto e vírgula)
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))
    
    console.log(`Executando ${commands.length} comandos...`)
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]
      if (command.trim()) {
        console.log(`Executando comando ${i + 1}/${commands.length}...`)
        const { error } = await supabase.rpc('exec_sql', { sql: command })
        
        if (error) {
          console.error(`Erro no comando ${i + 1}:`, error)
          // Continuar com os próximos comandos mesmo se houver erro
        } else {
          console.log(`Comando ${i + 1} executado com sucesso`)
        }
      }
    }
    
    console.log('Migração concluída!')
    
  } catch (error) {
    console.error('Erro ao aplicar migração:', error)
  }
}

applyMigration()