/**
 * generarPagosExamenes.js
 * Genera los pagos pendientes para todos los alumnos inscritos en exámenes
 * que tengan costo y aún no tengan pago generado.
 * 
 * Uso: node scripts/generarPagosExamenes.js
 */

require('dotenv').config()
const mongoose = require('mongoose')
const Examen   = require('../models/Examen')
const Payment  = require('../models/Payments')
const Alumno   = require('../models/Alumno')
const User     = require('../models/User')

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI

if (!MONGO_URI) {
  console.error('❌ Variable MONGODB_URI no encontrada en .env')
  process.exit(1)
}

async function run() {
  console.log('🔌 Conectando a MongoDB...')
  await mongoose.connect(MONGO_URI)
  console.log('✅ Conectado\n')

  // Obtener un usuario admin para createdBy
  const adminUser = await User.findOne({ role: 'admin', isActive: true }).select('_id').lean()
  if (!adminUser) {
    console.error('❌ No se encontró ningún usuario admin activo')
    await mongoose.disconnect()
    process.exit(1)
  }
  const adminId = adminUser._id
  console.log(`👤 Usando admin ID: ${adminId}\n`)

  // Traer todos los exámenes activos con costo > 0
  const examenes = await Examen.find({
    isActive: true,
    'requisitos.costoExamen': { $gt: 0 },
    'alumnosInscritos.0': { $exists: true }
  }).lean()

  console.log(`📋 Exámenes con costo encontrados: ${examenes.length}\n`)

  if (examenes.length === 0) {
    console.log('ℹ️  No hay exámenes con costo y alumnos inscritos.')
    await mongoose.disconnect()
    return
  }

  let totalCreados  = 0
  let totalExisten  = 0
  let totalErrores  = 0

  for (const examen of examenes) {
    const costoExamen = Number(examen.requisitos?.costoExamen) || 0
    const fechaExamen = examen.fecha ? new Date(examen.fecha) : new Date()
    // dueDate: si la fecha ya pasó, usar hoy + 7 días para que no quede vencido
    const hoy   = new Date()
    const dueDate = fechaExamen > hoy ? fechaExamen : new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000)

    console.log(`\n📌 Examen: "${examen.nombre}"`)
    console.log(`   Costo: $${costoExamen} | Alumnos inscritos: ${examen.alumnosInscritos.length}`)

    for (const inscripcion of examen.alumnosInscritos) {
      const alumnoId = inscripcion.alumno
      if (!alumnoId) continue

      try {
        // Verificar si ya existe el pago
        const existe = await Payment.findOne({
          alumno:    alumnoId,
          examenRef: examen._id,
          isActive:  true
        })

        if (existe) {
          console.log(`   ⏭️  Alumno ${alumnoId} ya tiene pago (${existe.status})`)
          totalExisten++
          continue
        }

        // Obtener alumno para tener su sucursal
        const alumno = await Alumno.findById(alumnoId).select('firstName lastName enrollment.sucursal').lean()
        const sucursalId = alumno?.enrollment?.sucursal || examen.sucursal

        // Calcular monto con descuento
        const descPct    = Number(inscripcion.pagoExamen?.descuento) || 0
        const montoFinal = Math.round((costoExamen - (costoExamen * descPct / 100)) * 100) / 100
        const statusInicial = inscripcion.pagoExamen?.pagado ? 'pagado' : 'pendiente'

        await Payment.create({
          alumno:      alumnoId,
          sucursal:    sucursalId,
          type:        'examen',
          description: `Pago de examen: ${examen.nombre}`,
          amount:      montoFinal,
          total:       montoFinal,
          status:      statusInicial,
          dueDate:     dueDate,
          examenRef:   examen._id,
          period: {
            month: dueDate.getMonth() + 1,
            year:  dueDate.getFullYear(),
          },
          createdBy: adminId,
          isActive:  true,
        })

        const nombre = alumno ? `${alumno.firstName} ${alumno.lastName}` : String(alumnoId)
        console.log(`   ✅ Pago creado: ${nombre} — $${montoFinal} (${statusInicial})`)
        totalCreados++

      } catch (err) {
        console.error(`   ❌ Error con alumno ${alumnoId}: ${err.message}`)
        if (err.errors) {
          Object.keys(err.errors).forEach(k => {
            console.error(`      Campo "${k}": ${err.errors[k].message}`)
          })
        }
        totalErrores++
      }
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 RESUMEN:')
  console.log(`   ✅ Pagos creados:    ${totalCreados}`)
  console.log(`   ⏭️  Ya existían:      ${totalExisten}`)
  console.log(`   ❌ Errores:          ${totalErrores}`)
  console.log('='.repeat(50))

  await mongoose.disconnect()
  console.log('\n🔌 Desconectado.')
}

run().catch(err => {
  console.error('❌ Error fatal:', err.message)
  process.exit(1)
})