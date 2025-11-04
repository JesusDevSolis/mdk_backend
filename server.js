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

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ 
        message: 'API del Sistema de Taekwondo funcionando correctamente',
        version: '2.0.0',
        status: 'active',
        modules: ['auth', 'sucursales', 'tutores', 'alumnos']
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
            alumnos: 'active'
        }
    });
});

// Rutas de la API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sucursales', require('./routes/sucursales'));
app.use('/api/tutores', require('./routes/tutores'));      // NUEVA RUTA
app.use('/api/alumnos', require('./routes/alumnos'));      // NUEVA RUTA

// Middleware para manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 API disponible en: http://localhost:${PORT}`);
    console.log(`🖼️  Imágenes: http://localhost:${PORT}/uploads/`);
    console.log(`🖼️  API Imágenes Logos: http://localhost:${PORT}/api/images/logos/`);
    console.log(`🖼️  API Imágenes Perfiles: http://localhost:${PORT}/api/images/profiles/`);
    console.log(`🥋 Módulos: Auth, Sucursales, Tutores, Alumnos`);
});

module.exports = app;