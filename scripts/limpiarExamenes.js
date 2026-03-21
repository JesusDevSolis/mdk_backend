/**
 * limpiarExamenes.js
 * Elimina TODOS los exámenes, calificaciones y graduaciones de la base de datos.
 * Uso: node scripts/limpiarExamenes.js
 */

require('dotenv').config()
const mongoose = require('mongoose')

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI

if (!MONGO_URI) {
  console.error('❌ Variable MONGODB_URI no encontrada en .env')
  process.exit(1)
}

async function limpiar() {
  console.log('🔌 Conectando a MongoDB...')
  await mongoose.connect(MONGO_URI)
  console.log('✅ Conectado\n')

  const db = mongoose.connection.db

  const antesExamenes      = await db.collection('examens').countDocuments()
  const antesCalificaciones = await db.collection('calificacions').countDocuments()
  const antesGraduaciones   = await db.collection('graduacions').countDocuments()

  console.log('📊 Documentos actuales:')
  console.log(`   Exámenes:       ${antesExamenes}`)
  console.log(`   Calificaciones: ${antesCalificaciones}`)
  console.log(`   Graduaciones:   ${antesGraduaciones}\n`)

  if (antesExamenes + antesCalificaciones + antesGraduaciones === 0) {
    console.log('ℹ️  La base de datos ya está limpia.')
    await mongoose.disconnect()
    return
  }

  const resE = await db.collection('examens').deleteMany({})
  const resC = await db.collection('calificacions').deleteMany({})
  const resG = await db.collection('graduacions').deleteMany({})

  console.log('✅ Limpieza completada:')
  console.log(`   Exámenes eliminados:       ${resE.deletedCount}`)
  console.log(`   Calificaciones eliminadas: ${resC.deletedCount}`)
  console.log(`   Graduaciones eliminadas:   ${resG.deletedCount}`)

  await mongoose.disconnect()
  console.log('\n🔌 Listo para crear nuevos exámenes.')
}

limpiar().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})