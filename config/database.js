const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Conectar sin opciones deprecadas
        const conn = await mongoose.connect(process.env.MONGODB_URI);

        // console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
        // console.log(`📊 Base de datos: ${conn.connection.name}`);
        
    } catch (error) {
        // console.error('❌ Error conectando a MongoDB:', error.message);
        
        // Intentar reconectar después de 5 segundos
        setTimeout(() => {
            console.log('🔄 Intentando reconectar a MongoDB...');
            connectDB();
        }, 5000);
    }
};

// Manejar eventos de conexión
// mongoose.connection.on('disconnected', () => {
//     console.log('⚠️  MongoDB desconectado');
// });

// mongoose.connection.on('reconnected', () => {
//     console.log('🔄 MongoDB reconectado');
// });

// Manejar cierre graceful
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        // console.log('📴 Conexión a MongoDB cerrada correctamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error cerrando conexión a MongoDB:', error);
        process.exit(1);
    }
});

module.exports = connectDB;