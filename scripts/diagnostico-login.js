/**
 * Script de diagnóstico para problemas de login
 * 
 * Uso: node scripts/diagnostico-login.js <email> <password>
 * Ejemplo: node scripts/diagnostico-login.js juan.her@gmail.com admin123
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Conexión a MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error.message);
        process.exit(1);
    }
};

// Definir el schema de User (simplificado)
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, lowercase: true },
    password: String,
    role: String,
    isActive: Boolean
}, { timestamps: true });

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Error al comparar contraseñas');
    }
};

const User = mongoose.model('User', userSchema);

// Función principal de diagnóstico
const diagnosticar = async () => {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('');
        console.log('📋 Uso: node scripts/diagnostico-login.js <email> <password>');
        console.log('');
        console.log('Ejemplo:');
        console.log('  node scripts/diagnostico-login.js juan.her@gmail.com admin123');
        console.log('');
        process.exit(1);
    }

    const email = args[0].toLowerCase();
    const password = args[1];

    try {
        await connectDB();

        console.log('');
        console.log('🔍 DIAGNÓSTICO DE LOGIN');
        console.log('='.repeat(60));
        console.log('');

        // 1. Buscar usuario
        console.log('📧 Email buscado:', email);
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            console.log('❌ Usuario NO encontrado en la base de datos');
            console.log('');
            console.log('💡 Sugerencia: Verifica que el email sea exactamente igual al registrado');
            process.exit(1);
        }

        console.log('✅ Usuario encontrado');
        console.log('');
        console.log('👤 INFORMACIÓN DEL USUARIO:');
        console.log('  - ID:', user._id);
        console.log('  - Nombre:', user.name);
        console.log('  - Email:', user.email);
        console.log('  - Rol:', user.role);
        console.log('  - Activo:', user.isActive);
        console.log('  - Creado:', user.createdAt);
        console.log('');

        // 2. Verificar si está activo
        if (!user.isActive) {
            console.log('⚠️  CUENTA DESACTIVADA');
            console.log('   El usuario existe pero está inactivo');
            process.exit(1);
        }

        console.log('✅ Cuenta activa');
        console.log('');

        // 3. Información del hash
        console.log('🔐 INFORMACIÓN DEL HASH:');
        console.log('  - Hash almacenado:', user.password);
        console.log('  - Longitud:', user.password.length);
        console.log('  - Algoritmo:', user.password.substring(0, 4)); // Debe ser $2a$ o $2b$
        console.log('  - Costo:', user.password.substring(4, 6)); // Debe ser 12
        console.log('');

        // 4. Validar formato del hash
        const hashPattern = /^\$2[aby]\$\d{2}\$.{53}$/;
        if (!hashPattern.test(user.password)) {
            console.log('⚠️  FORMATO DE HASH INVÁLIDO');
            console.log('   El hash no tiene el formato correcto de bcrypt');
        } else {
            console.log('✅ Formato de hash válido');
        }
        console.log('');

        // 5. Probar contraseña ingresada
        console.log('🔑 PRUEBA DE CONTRASEÑA:');
        console.log('  - Contraseña ingresada:', password);
        console.log('  - Longitud:', password.length);
        console.log('');

        // 6. Comparar usando bcrypt.compare directamente
        console.log('🧪 PRUEBA 1: bcrypt.compare directo');
        const isValid1 = await bcrypt.compare(password, user.password);
        console.log('  Resultado:', isValid1 ? '✅ VÁLIDA' : '❌ INVÁLIDA');
        console.log('');

        // 7. Comparar usando el método del modelo
        console.log('🧪 PRUEBA 2: user.comparePassword (método del modelo)');
        const isValid2 = await user.comparePassword(password);
        console.log('  Resultado:', isValid2 ? '✅ VÁLIDA' : '❌ INVÁLIDA');
        console.log('');

        // 8. Generar nuevo hash para comparar
        console.log('🧪 PRUEBA 3: Generar nuevo hash de la misma contraseña');
        const newHash = await bcrypt.hash(password, 12);
        console.log('  Nuevo hash:', newHash);
        const isValid3 = await bcrypt.compare(password, newHash);
        console.log('  ¿El nuevo hash funciona?:', isValid3 ? '✅ SÍ' : '❌ NO');
        console.log('');

        // 9. Probar contraseñas comunes
        console.log('🧪 PRUEBA 4: Probar contraseñas comunes');
        const commonPasswords = ['admin123', 'password', '123456', 'admin', user.name.toLowerCase()];
        for (const testPass of commonPasswords) {
            const result = await bcrypt.compare(testPass, user.password);
            if (result) {
                console.log(`  ✅ ¡ENCONTRADA! La contraseña es: "${testPass}"`);
                break;
            } else {
                console.log(`  ❌ No es: "${testPass}"`);
            }
        }
        console.log('');

        // 10. Resumen
        console.log('='.repeat(60));
        console.log('📊 RESUMEN:');
        console.log('');
        if (isValid1 || isValid2) {
            console.log('✅ LA CONTRASEÑA ES CORRECTA');
            console.log('');
            console.log('   Si el login no funciona en el sistema, el problema está en:');
            console.log('   - El frontend no está enviando la contraseña correctamente');
            console.log('   - Hay un problema con los headers o CORS');
            console.log('   - El authController tiene algún problema adicional');
        } else {
            console.log('❌ LA CONTRASEÑA ES INCORRECTA');
            console.log('');
            console.log('   La contraseña que estás usando no coincide con el hash almacenado.');
            console.log('   Opciones:');
            console.log('   1. Resetear la contraseña con el script resetPassword.js');
            console.log('   2. Usar el script con las contraseñas comunes probadas arriba');
            console.log('   3. Contactar al usuario para confirmar la contraseña correcta');
        }
        console.log('');

    } catch (error) {
        console.error('');
        console.error('❌ ERROR:', error.message);
        console.error('');
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('📴 Conexión cerrada');
        console.log('');
        process.exit(0);
    }
};

diagnosticar();