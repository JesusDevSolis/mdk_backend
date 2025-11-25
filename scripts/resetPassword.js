/**
 * Script para resetear la contraseña de un usuario
 * 
 * Uso: node scripts/resetPassword.js <email> <nueva_contraseña>
 * Ejemplo: node scripts/resetPassword.js juan.her@gmail.com admin123
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

// Definir el schema de User (simplificado para el script)
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, lowercase: true },
    password: String,
    role: String,
    isActive: Boolean
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Función principal
const resetPassword = async () => {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('');
        console.log('📋 Uso: node scripts/resetPassword.js <email> <nueva_contraseña>');
        console.log('');
        console.log('Ejemplo:');
        console.log('  node scripts/resetPassword.js juan.her@gmail.com admin123');
        console.log('');
        process.exit(1);
    }

    const email = args[0].toLowerCase();
    const newPassword = args[1];

    if (newPassword.length < 6) {
        console.error('❌ La contraseña debe tener al menos 6 caracteres');
        process.exit(1);
    }

    try {
        await connectDB();

        // Buscar usuario
        const user = await User.findOne({ email });

        if (!user) {
            console.error(`❌ Usuario con email "${email}" no encontrado`);
            process.exit(1);
        }

        console.log('');
        console.log('👤 Usuario encontrado:');
        console.log(`   Nombre: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Rol: ${user.role}`);
        console.log(`   Activo: ${user.isActive}`);
        console.log('');

        // Hashear la nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Actualizar la contraseña directamente (sin pasar por el middleware)
        await User.updateOne(
            { _id: user._id },
            { $set: { password: hashedPassword } }
        );

        console.log('✅ Contraseña actualizada exitosamente');
        console.log('');
        console.log('🔐 Nuevas credenciales:');
        console.log(`   Email: ${email}`);
        console.log(`   Contraseña: ${newPassword}`);
        console.log('');

        // Verificar que la contraseña se guardó correctamente
        const updatedUser = await User.findById(user._id).select('+password');
        const isValid = await bcrypt.compare(newPassword, updatedUser.password);
        
        if (isValid) {
            console.log('✅ Verificación: La contraseña fue hasheada y guardada correctamente');
        } else {
            console.log('⚠️ Advertencia: La verificación de contraseña falló');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('');
        console.log('📴 Conexión cerrada');
        process.exit(0);
    }
};

resetPassword();