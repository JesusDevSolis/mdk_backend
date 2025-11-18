const mongoose = require('mongoose');
require('dotenv').config();

// Importar el modelo de User
const User = require('../models/User');

// Función para crear usuario administrador
const createAdminUser = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    // console.log('Conectado a MongoDB');

    // Verificar si ya existe un admin
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      // console.log('Ya existe un usuario administrador:');
      // console.log(`Email: ${existingAdmin.email}`);
      // console.log(`Nombre: ${existingAdmin.name}`);
      return;
    }

    // Datos del administrador
    const adminData = {
      name: 'Administrador',
      email: 'admin@taekwondo.com',
      password: 'admin123',
      role: 'admin',
      phone: '+52 9673000525',
      address: 'San Cristobal de las casas, Chiapas',
      isActive: true
    };

    // Crear usuario administrador
    const admin = new User(adminData);
    await admin.save();

    // console.log('Usuario administrador creado exitosamente!');
    // console.log('Email:', adminData.email);
    // console.log('Contraseña:', adminData.password);
    // console.log('Nombre:', adminData.name);
    // console.log('Rol:', adminData.role);
    
  } catch (error) {
    console.error('Error creando usuario administrador:', error.message);
    
    if (error.code === 11000) {
      console.log('El email ya está en uso');
    }
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('Conexión cerrada');
    process.exit(0);
  }
};

// Ejecutar si el archivo se ejecuta directamente
if (require.main === module) {
  createAdminUser();
}

module.exports = createAdminUser;