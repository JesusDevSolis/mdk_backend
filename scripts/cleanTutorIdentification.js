/**
 * cleanTutorIdentification.js
 * Elimina el índice unique de identification.number y el campo completo
 * de todos los tutores en MongoDB.
 *
 * Uso: node scripts/cleanTutorIdentification.js
 */

require('dotenv').config()
const mongoose = require('mongoose')

const URI = process.env.MONGODB_URI

async function clean() {
  try {
    await mongoose.connect(URI)
    console.log('✅ Conectado a MongoDB')

    const col = mongoose.connection.db.collection('tutors')

    // 1. Eliminar el índice problemático si existe
    try {
      await col.dropIndex('identification.number_1')
      console.log('✅ Índice identification.number_1 eliminado')
    } catch (e) {
      console.log('ℹ️  El índice no existe o ya fue eliminado:', e.message)
    }

    // 2. Contar tutores con identification
    const conId = await col.countDocuments({
      $or: [
        { 'identification.number': { $exists: true } },
        { 'identification.type':   { $exists: true } }
      ]
    })
    console.log(`🔍 Tutores con campo identification: ${conId}`)

    if (conId === 0) {
      console.log('✅ Nada que limpiar en los documentos')
    } else {
      // 3. Eliminar el campo identification de todos los documentos
      const result = await col.updateMany(
        {},
        { $unset: { identification: '' } }
      )
      console.log(`✅ Tutores actualizados: ${result.modifiedCount}`)
    }

    console.log('✅ Limpieza completa — campo identification eliminado')

  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

clean()