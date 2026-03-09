const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log('🔌 Conectando a MongoDB Atlas...');
        
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });

        console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
        console.log(`📊 Base de datos: ${conn.connection.name}`);
        
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error.message);
        console.error('💡 Verifica:');
        console.error('   1. IP autorizada en Atlas (Network Access)');
        console.error('   2. Cluster no pausado en Atlas');
        console.error('   3. Usuario y contraseña correctos en MONGODB_URI');
        
        setTimeout(() => {
            console.log('🔄 Reintentando conexión en 5 segundos...');
            connectDB();
        }, 5000);
    }
};

mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB desconectado');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconectado');
});

process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('📴 Conexión a MongoDB cerrada correctamente');
        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
});

module.exports = connectDB;