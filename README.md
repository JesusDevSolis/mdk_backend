# Backend - Sistema de Taekwondo

Backend del sistema de gestión para escuelas de taekwondo desarrollado con Node.js y Express.

## 🚀 Instalación

### Prerrequisitos

- Node.js v16 o superior
- npm o yarn
- Cuenta en MongoDB Atlas

### Pasos de instalación

1. **Clonar e instalar dependencias:**

```bash
cd backend
npm install
```

2.**Configurar variables de entorno:**

```bash
cp .env.example .env
```

3.**Editar el archivo .env con tus datos:**

- `MONGODB_URI`: Tu string de conexión de MongoDB Atlas
- `JWT_SECRET`: Una clave secreta segura
- Otras configuraciones según necesites

4.**Ejecutar en modo desarrollo:**

```bash
npm run dev
```

5.**Verificar que funcione:**

- Abre tu navegador en `http://localhost:5000`
- Deberías ver un mensaje de confirmación
- Verifica `/api/health` para el health check

## 📁 Estructura del proyecto

backend/
├── config/          # Configuraciones (DB, etc.)
├── models/          # Modelos de Mongoose (próximo paso)
├── routes/          # Rutas de la API (próximo paso)
├── controllers/     # Controladores (próximo paso)
├── middleware/      # Middleware personalizado (próximo paso)
├── utils/           # Utilidades (próximo paso)
├── uploads/         # Archivos subidos (se crea automáticamente)
├── server.js        # Archivo principal
├── package.json     # Dependencias
└── .env             # Variables de entorno

## 🔧 Scripts disponibles

- `npm start`: Ejecutar en producción
- `npm run dev`: Ejecutar en desarrollo con nodemon
- `npm test`: Ejecutar tests (pendiente configurar)

## 🌍 Variables de entorno

Consulta `.env.example` para ver todas las variables necesarias.

## 📝 Notas

Este es el paso 1.2 del desarrollo. En los siguientes pasos se agregarán:

- Modelos de base de datos
- Rutas de la API
- Middleware de autenticación
- Y más funcionalidades

---
Desarrollado paso a paso 🥋
