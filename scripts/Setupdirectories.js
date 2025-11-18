const fs = require('fs').promises;
const path = require('path');

// Función para crear directorios necesarios
const setupDirectories = async () => {
  try {
    const directories = [
      'uploads',
      'uploads/logos',
      'uploads/profiles',
      'uploads/documents',
      'uploads/temp'
    ];

    // console.log('🔧 Configurando directorios necesarios...');

    for (const dir of directories) {
      const fullPath = path.join(__dirname, '..', dir);
      
      try {
        await fs.access(fullPath);
        console.log(`Directorio ya existe: ${dir}`);
      } catch {
        await fs.mkdir(fullPath, { recursive: true });
        console.log(`Directorio creado: ${dir}`);
      }
    }

    // Crear archivo .gitkeep para mantener directorios en git
    const gitkeepContent = '# Este archivo mantiene el directorio en git\n';
    
    for (const dir of directories) {
      const gitkeepPath = path.join(__dirname, '..', dir, '.gitkeep');
      try {
        await fs.writeFile(gitkeepPath, gitkeepContent);
      } catch (error) {
        console.log(`No se pudo crear .gitkeep en ${dir}`);
      }
    }

    // console.log('Configuración de directorios completada!');
    
  } catch (error) {
    console.error('Error configurando directorios:', error.message);
  }
};

// Ejecutar si el archivo se ejecuta directamente
if (require.main === module) {
  setupDirectories();
}

module.exports = setupDirectories;