const mongoose = require('mongoose');
require('dotenv').config();

// Importar el modelo de User
const User = require('../models/User');

// Función para crear instructores de prueba
const createInstructors = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    // console.log('Conectado a MongoDB');

    // Verificar cuántos instructores ya existen
    const existingInstructors = await User.find({ role: 'instructor' });
    // console.log(`Instructores existentes: ${existingInstructors.length}`);

    if (existingInstructors.length >= 3) {
      console.log('Ya hay suficientes instructores. No es necesario crear más.');
      return;
    }

    // Datos de instructores de prueba
    const instructorsData = [
      {
        name: 'Carlos Mendoza',
        email: 'carlos.instructor@taekwondo.com',
        password: 'instructor123',
        role: 'instructor',
        phone: '+52 9612345678',
        address: 'Tuxtla Gutiérrez, Chiapas',
        isActive: true
      },
      {
        name: 'María González',
        email: 'maria.instructor@taekwondo.com',
        password: 'instructor123',
        role: 'instructor',
        phone: '+52 9613456789',
        address: 'San Cristóbal, Chiapas',
        isActive: true
      },
      {
        name: 'Roberto Silva',
        email: 'roberto.instructor@taekwondo.com',
        password: 'instructor123',
        role: 'instructor',
        phone: '+52 9614567890',
        address: 'Comitán, Chiapas',
        isActive: true
      }
    ];

    // console.log('🔧 Creando instructores de prueba...');

    for (const instructorData of instructorsData) {
      // Verificar si el email ya existe
      const existingUser = await User.findOne({ email: instructorData.email });
      
      if (existingUser) {
        console.log(`El instructor ${instructorData.name} ya existe`);
        continue;
      }

      // Crear instructor
      const instructor = new User(instructorData);
      await instructor.save();
      
      console.log(`Instructor creado: ${instructorData.name} (${instructorData.email})`);
    }

    // console.log('Instructores de prueba creados exitosamente!');
    // console.log('');
    // console.log('Credenciales de acceso:');
    instructorsData.forEach(instructor => {
      console.log(`   ${instructor.name}: ${instructor.email} / instructor123`);
    });
    
  } catch (error) {
    console.error('Error creando instructores:', error.message);
    
    if (error.code === 11000) {
      console.log('Algunos emails ya están en uso');
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
  createInstructors();
}

module.exports = createInstructors;