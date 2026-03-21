/**
 * seedCinturones.js
 * Verifica los valores de cinturón en la colección alumnos
 * y muestra un resumen de los niveles existentes.
 * No modifica datos — solo diagnóstico.
 *
 * Para migrar valores legacy (ej. 'blanco' → 'principiante'),
 * descomenta la sección MIGRACIÓN al final.
 *
 * Uso: node scripts/seedCinturones.js
 */

require('dotenv').config()
const mongoose = require('mongoose')

// Mapa de valores legacy → nuevos valores del sistema
const LEGACY_MAP = {
  'blanco':        'principiante',
  'blanco-amarillo': 'blanca-1',
  'amarillo':      'amarilla',
  'amarillo-naranja': 'naranja',
  'naranja-verde': 'verde',
  'verde-azul':    'azul',
  'azul-marron':   'marron',
  'marron-negro':  'marron-avanzada',
  'negro-1':       'negra-1-dan',
  'negro-2':       'negra-2-dan',
  'negro-3':       'negra-3-dan',
  'negro-4':       'negra-4-dan',
  'negro-5':       'negra-5-dan',
  'negro-6':       'negra-6-dan',
  'negro-7':       'negra-7-dan',
  'negro-8':       'negra-8-dan',
  'negro-9':       'negra-9-dan',
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
    console.log('✅ Conectado a MongoDB\n')

    const col = mongoose.connection.db.collection('alumnos')
    const total = await col.countDocuments({ isActive: true })
    console.log(`📊 Total alumnos activos: ${total}`)

    // Agrupar por nivel de cinturón
    const niveles = await col.aggregate([
      { $group: { _id: '$belt.level', count: { $sum: 1 } } },
      { $sort:  { count: -1 } }
    ]).toArray()

    console.log('\n🥋 Distribución actual de cinturones:')
    niveles.forEach(n => {
      const legacy = LEGACY_MAP[n._id] ? ` → migrar a "${LEGACY_MAP[n._id]}"` : ''
      const warn   = LEGACY_MAP[n._id] ? ' ⚠️ LEGACY' : ''
      console.log(`   ${String(n.count).padStart(3)} alumnos — "${n._id}"${warn}${legacy}`)
    })

    const legacyCount = niveles.filter(n => LEGACY_MAP[n._id]).reduce((s, n) => s + n.count, 0)
    if (legacyCount > 0) {
      console.log(`\n⚠️  ${legacyCount} alumnos con valores legacy. Descomenta la sección MIGRACIÓN para actualizar.`)
    } else {
      console.log('\n✅ Todos los valores son del nuevo sistema.')
    }

    // ── MIGRACIÓN (descomenta para ejecutar) ──────────────────────────────────
    
    console.log('\n🔄 Iniciando migración de valores legacy...')
    let migrados = 0
    for (const [oldVal, newVal] of Object.entries(LEGACY_MAP)) {
      const res = await col.updateMany(
        { 'belt.level': oldVal },
        { $set: { 'belt.level': newVal } }
      )
      if (res.modifiedCount > 0) {
        console.log(`  ✅ "${oldVal}" → "${newVal}": ${res.modifiedCount} alumnos`)
        migrados += res.modifiedCount
      }
    }
    console.log(`\n✅ Migración completa: ${migrados} alumnos actualizados`)
    

  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

run()