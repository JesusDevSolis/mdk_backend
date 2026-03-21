/**
 * seedDisciplinas.js
 * Inserta las 5 disciplinas del sistema en MongoDB si no existen.
 * Actualiza nombre, color y emoji si el slug ya existe (idempotente).
 *
 * Uso: node scripts/seedDisciplinas.js
 */

require('dotenv').config()
const mongoose = require('mongoose')

const DISCIPLINAS = [
  {
    slug:        'tae-kwon-do',
    nombre:      'Tae Kwon Do',
    descripcion: 'Arte marcial coreana de origen olímpico. Enfocada en patadas y técnicas de pie.',
    color:       '#3B82F6',
    emoji:       '🥋',
    orden:       1,
  },
  {
    slug:        'tang-soo-do',
    nombre:      'Tang Soo Do',
    descripcion: 'Arte marcial coreana tradicional. Combina golpes de puño, patadas y técnicas de bloqueo.',
    color:       '#8B5CF6',
    emoji:       '🥊',
    orden:       2,
  },
  {
    slug:        'hapkido',
    nombre:      'Hapkido',
    descripcion: 'Arte marcial coreana enfocada en lanzamientos, inmovilizaciones y patadas.',
    color:       '#10B981',
    emoji:       '🤸',
    orden:       3,
  },
  {
    slug:        'gumdo',
    nombre:      'Gumdo',
    descripcion: 'Arte marcial coreana del sable. Técnicas con espada basadas en la tradición coreana.',
    color:       '#F59E0B',
    emoji:       '⚔️',
    orden:       4,
  },
  {
    slug:        'pequenos-dragones',
    nombre:      'Pequeños Dragones',
    descripcion: 'Programa especial para niños de 3 a 7 años. Psicomotricidad, disciplina y diversión.',
    color:       '#EF4444',
    emoji:       '🐉',
    orden:       5,
  },
]

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
    console.log('✅ Conectado a MongoDB')

    const col = mongoose.connection.db.collection('disciplinas')

    let creadas = 0, actualizadas = 0

    for (const disc of DISCIPLINAS) {
      const existe = await col.findOne({ slug: disc.slug })

      if (existe) {
        await col.updateOne(
          { slug: disc.slug },
          { $set: {
            nombre:      disc.nombre,
            descripcion: disc.descripcion,
            color:       disc.color,
            emoji:       disc.emoji,
            orden:       disc.orden,
            isActive:    true,
          }}
        )
        console.log(`♻️  Actualizada: ${disc.nombre}`)
        actualizadas++
      } else {
        await col.insertOne({
          ...disc,
          isActive:    true,
          nivelGrado:  [],
          sucursales:  [],
          instructores:[],
          horarios:    [],
          logo: { url: null, filename: null, originalName: null, mimetype: null, size: null },
          createdAt:   new Date(),
          updatedAt:   new Date(),
        })
        console.log(`✅ Creada: ${disc.nombre}`)
        creadas++
      }
    }

    console.log(`\n📊 Resultado: ${creadas} creadas, ${actualizadas} actualizadas`)

  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

run()