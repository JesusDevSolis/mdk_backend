const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Importar configuración de base de datos
const connectDB = require('./config/database');

const app = express();

// Conectar a la base de datos
connectDB();

// ¡IMPORTANTE! Configurar helmet con políticas más permisivas
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Deshabilitar CSP que puede bloquear imágenes
}));

// Configurar CORS global más permisivo
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// CORS adicional (por si acaso)
app.use(cors({
    origin: true, // Permitir cualquier origen
    credentials: true,
    optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // Aumentar límite para testing
    message: 'Demasiadas peticiones desde esta IP'
});
app.use(limiter);

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const path = require('path');

// Headers súper permisivos para archivos estáticos
app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.header('Cache-Control', 'no-cache'); // Deshabilitar cache temporalmente
    next();
});

// Servir archivos estáticos 
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: 0, // Sin cache para testing
    index: false,
    dotfiles: 'ignore',
    setHeaders: (res, path) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

// Endpoint alternativo para imágenes con headers súper permisivos
app.get('/api/images/logos/:filename', (req, res) => {
    const { filename } = req.params;
    const imagePath = path.join(__dirname, 'uploads', 'logos', filename);
    
    // Headers súper permisivos
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.header('Cache-Control', 'no-cache');
    
    // Verificar si el archivo existe
    const fs = require('fs');
    if (!fs.existsSync(imagePath)) {
        return res.status(404).json({
            success: false,
            message: 'Imagen no encontrada'
        });
    }
    
    // Servir la imagen
    res.sendFile(imagePath);
});

// Endpoint para imágenes de perfiles
app.get('/api/images/profiles/:filename', (req, res) => {
    const { filename } = req.params;
    const imagePath = path.join(__dirname, 'uploads', 'profiles', filename);
    
    // Headers súper permisivos
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.header('Cache-Control', 'no-cache');
    
    // Verificar si el archivo existe
    const fs = require('fs');
    if (!fs.existsSync(imagePath)) {
        return res.status(404).json({
            success: false,
            message: 'Imagen no encontrada'
        });
    }
    
    // Servir la imagen
    res.sendFile(imagePath);
});

// Endpoint para imágenes de instructores
app.get('/api/images/instructors/:filename', (req, res) => {
    const { filename } = req.params;
    const imagePath = path.join(__dirname, 'uploads', 'instructors', filename);
    
    // Headers súper permisivos
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.header('Cache-Control', 'no-cache');
    
    // Verificar si el archivo existe
    const fs = require('fs');
    if (!fs.existsSync(imagePath)) {
        return res.status(404).json({
            success: false,
            message: 'Imagen no encontrada'
        });
    }
    
    // Servir la imagen
    res.sendFile(imagePath);
});

// 🔧 NUEVO: Endpoint para comprobantes de pago (documentos)
app.get('/api/documents/:filename', (req, res) => {
    const { filename } = req.params;
    const documentPath = path.join(__dirname, 'uploads', 'documents', filename);
    
    // Headers súper permisivos
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.header('Cache-Control', 'no-cache');
    
    // Verificar si el archivo existe
    const fs = require('fs');
    if (!fs.existsSync(documentPath)) {
        console.log('❌ Documento no encontrado:', documentPath);
        return res.status(404).json({
            success: false,
            message: 'Documento no encontrado',
            path: documentPath
        });
    }
    
    // Configurar el tipo de contenido según la extensión
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    if (contentTypes[ext]) {
        res.header('Content-Type', contentTypes[ext]);
    }
    
    // Servir el documento
    res.sendFile(documentPath);
});

// Endpoint de prueba para listar documentos (útil para debugging)
app.get('/api/documents', (req, res) => {
    const fs = require('fs');
    const documentsPath = path.join(__dirname, 'uploads', 'documents');
    
    try {
        if (!fs.existsSync(documentsPath)) {
            return res.json({
                success: true,
                message: 'Carpeta de documentos no existe aún',
                documents: []
            });
        }
        
        const files = fs.readdirSync(documentsPath);
        const documents = files.map(file => ({
            filename: file,
            url: `/uploads/documents/${file}`,
            apiUrl: `/api/documents/${file}`,
            fullUrl: `http://localhost:${PORT}/uploads/documents/${file}`,
            fullApiUrl: `http://localhost:${PORT}/api/documents/${file}`
        }));
        
        res.json({
            success: true,
            total: documents.length,
            documentsPath,
            documents
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al listar documentos',
            error: error.message
        });
    }
});

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ 
        message: 'API del Sistema de Taekwondo funcionando correctamente',
        version: '2.0.0',
        status: 'active',
        modules: ['auth', 'sucursales', 'tutores', 'alumnos', 'pagos', 'instructores']
    });
});

// Ruta de health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        modules: {
            auth: 'active',
            sucursales: 'active',
            tutores: 'active',
            alumnos: 'active',
            pagos: 'active',
            instructores: 'active'
        }
    });
});

// Rutas de la API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sucursales', require('./routes/sucursales'));
app.use('/api/tutores', require('./routes/tutores'));
app.use('/api/alumnos', require('./routes/alumnos'));
app.use('/api/pagos', require('./routes/payments'));
app.use('/api/instructores', require('./routes/instructors'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/horarios', require('./routes/horarios'));
app.use('/api/asistencias', require('./routes/asistencias'));
app.use('/api/examenes', require('./routes/examenes'));
app.use('/api/graduaciones', require('./routes/graduaciones'));

// Middleware para manejo de errores
app.use((err, req, res, next) => {
    // console.error(err.stack);
    res.status(500).json({ 
        message: 'Algo salió mal!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
    });
});

// Manejar rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({ 
        message: `Ruta ${req.originalUrl} no encontrada` 
    });
});

const PORT = process.env.PORT || 3005;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API disponible en: http://localhost:${PORT}`);
});

module.exports = app;