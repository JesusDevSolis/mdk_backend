/**
 * fixTutorIdentification.js
 * Limpia documentos Tutor que tienen identification.number: "" (string vacío)
 * causando colisión en el índice único sparse.
 *
 * Uso: node scripts/fixTutorIdentification.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function fix() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const db = mongoose.connection.db;
    const col = db.collection('tutors');

    // Buscar documentos con identification.number vacío o null
    const conProblema = await col.find({
      $or: [
        { 'identification.number': '' },
        { 'identification.number': null }
      ]
    }).toArray();

    console.log(`🔍 Tutores con identification.number vacío: ${conProblema.length}`);
    conProblema.forEach(t => {
      console.log(`  - ${t.firstName} ${t.lastName} | number: "${t.identification?.number}"`);
    });

    if (conProblema.length === 0) {
      console.log('✅ No hay documentos que limpiar');
      process.exit(0);
    }

    // Quitar el campo identification.number usando $unset
    const result = await col.updateMany(
      { $or: [{ 'identification.number': '' }, { 'identification.number': null }] },
      { $unset: { 'identification.number': '' } }
    );

    console.log(`✅ Tutores actualizados: ${result.modifiedCount}`);
    console.log('✅ identification.number vacíos eliminados — índice sparse limpio');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fix();