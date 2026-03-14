/**
 * fixEmptyEmails.js
 * Limpia documentos de Alumno que tienen email: "" (string vacío)
 * causando conflictos en el índice único sparse.
 *
 * Uso: node scripts/fixEmptyEmails.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixEmptyEmails() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('alumnos');

        // Encontrar documentos con email vacío
        const conEmailVacio = await collection.find({
        email: { $in: ['', null] }
        }).toArray();

        console.log(`🔍 Documentos con email vacío o null: ${conEmailVacio.length}`);
        conEmailVacio.forEach(a => {
            console.log(`  - ${a.firstName} ${a.lastName} | email: "${a.email}"`);
        });

        if (conEmailVacio.length === 0) {
            console.log('✅ No hay documentos que limpiar');
            process.exit(0);
        }

        // Quitar el campo email usando $unset
        const result = await collection.updateMany(
            { email: { $in: ['', null] } },
            { $unset: { email: '' } }
        );

        console.log(`✅ Documentos actualizados: ${result.modifiedCount}`);
        console.log('✅ Emails vacíos eliminados — índice sparse limpio');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

fixEmptyEmails();