const Sucursal = require('../models/Sucursal');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// @desc    Obtener todas las sucursales
// @route   GET /api/sucursales
// @access  Private
const getSucursales = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      isActive, 
      manager,
      search 
    } = req.query;

    // Construir filtros
    const filters = {};
    
    // Filtro por estado activo
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    
    // Filtro por manager
    if (manager) {
      filters.manager = manager;
    }
    
    // Búsqueda por nombre o dirección
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    // Si el usuario no es admin, solo puede ver sucursales donde es manager
    if (req.user.role !== 'admin') {
      filters.manager = req.user._id;
    }

    // Calcular skip para paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // USAR FIND EN LUGAR DE AGGREGATE para que funcionen los virtuals
    const sucursales = await Sucursal.find(filters)
      .populate('manager', 'name email role')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Sucursal.countDocuments(filters);

    // Convertir a datos públicos para incluir virtuals
    const sucursalesPublicas = sucursales.map(sucursal => sucursal.getPublicInfo());

    res.json({
      success: true,
      data: {
        sucursales: sucursalesPublicas,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo sucursales:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener sucursal por ID
// @route   GET /api/sucursales/:id
// @access  Private
const getSucursalById = async (req, res) => {
  try {
    const { id } = req.params;

    const sucursal = await Sucursal.findById(id)
      .populate('manager', 'name email role phone')
      .populate('createdBy', 'name email');

    if (!sucursal) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    // Verificar permisos: admin puede ver todas, instructor solo las que maneja
    if (req.user.role !== 'admin' && sucursal.manager?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta sucursal'
      });
    }

    // Actualizar estadísticas antes de enviar
    await sucursal.updateStats();

    res.json({
      success: true,
      data: {
        sucursal: sucursal.getPublicInfo()
      }
    });

  } catch (error) {
    console.error('Error obteniendo sucursal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Crear nueva sucursal
// @route   POST /api/sucursales
// @access  Private (Admin only)
const createSucursal = async (req, res) => {
  try {
    const {
      name,
      address,
      phone,
      email,
      description,
      capacity,
      schedule,
      settings,
      manager
    } = req.body;

    // Verificar que el nombre no exista
    const existingSucursal = await Sucursal.findOne({ name });
    if (existingSucursal) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una sucursal con este nombre'
      });
    }

    // Validar manager si se proporciona
    if (manager && manager !== '') {
      const managerUser = await User.findById(manager);
      if (!managerUser) {
        return res.status(400).json({
          success: false,
          message: 'Manager no encontrado'
        });
      }
      
      if (!['admin', 'instructor'].includes(managerUser.role)) {
        return res.status(400).json({
          success: false,
          message: 'El manager debe ser un administrador o instructor'
        });
      }
    }

    // Crear sucursal
    const sucursalData = {
      name,
      address,
      phone,
      email,
      description,
      capacity,
      schedule,
      settings,
      manager: manager && manager !== '' ? manager : undefined,
      createdBy: req.user._id
    };

    const sucursal = new Sucursal(sucursalData);
    await sucursal.save();

    // Poblar datos antes de enviar respuesta
    await sucursal.populate('manager', 'name email role');
    await sucursal.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Sucursal creada exitosamente',
      data: {
        sucursal: sucursal.getPublicInfo()
      }
    });

  } catch (error) {
    console.error('Error creando sucursal:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Actualizar sucursal
// @route   PUT /api/sucursales/:id
// @access  Private (Admin or Manager)
const updateSucursal = async (req, res) => {
  try {
    console.log('📥 UPDATE - Datos recibidos:', req.body);
    console.log('🆔 UPDATE - ID:', req.params.id);
    console.log('👤 UPDATE - Usuario:', req.user.email);
    
    const { id } = req.params;
    const {
      name,
      address,
      phone,
      email,
      description,
      capacity,
      schedule,
      settings,
      manager,
      isActive
    } = req.body;

    const sucursal = await Sucursal.findById(id);
    
    if (!sucursal) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    // Verificar permisos
    const canEdit = req.user.role === 'admin' || sucursal.manager?.toString() === req.user._id.toString();
    
    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para editar esta sucursal'
      });
    }

    // Verificar nombre único si se está cambiando
    if (name && name !== sucursal.name) {
      const existingSucursal = await Sucursal.findOne({ 
        name, 
        _id: { $ne: id } 
      });
      
      if (existingSucursal) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una sucursal con este nombre'
        });
      }
    }

    // Validar manager si se está cambiando (solo admin)
    if (manager && manager !== '' && req.user.role === 'admin') {
      const managerUser = await User.findById(manager);
      if (!managerUser) {
        return res.status(400).json({
          success: false,
          message: 'Manager no encontrado'
        });
      }
      
      if (!['admin', 'instructor'].includes(managerUser.role)) {
        return res.status(400).json({
          success: false,
          message: 'El manager debe ser un administrador o instructor'
        });
      }
    }

    // Actualizar campos
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (description !== undefined) updateData.description = description;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (schedule !== undefined) updateData.schedule = schedule;
    if (settings !== undefined) updateData.settings = settings;
    
    // Solo admin puede cambiar manager e isActive
    if (req.user.role === 'admin') {
      // 🔧 CORREGIDO: Manejar string vacío en manager
      if (manager !== undefined) {
        updateData.manager = manager === '' ? null : manager;
      }
      if (isActive !== undefined) updateData.isActive = isActive;
    }

    console.log('✅ Datos limpios para actualizar:', updateData);

    const updatedSucursal = await Sucursal.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('manager', 'name email role')
     .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Sucursal actualizada exitosamente',
      data: {
        sucursal: updatedSucursal.getPublicInfo()
      }
    });

  } catch (error) {
    console.error('❌ ERROR COMPLETO:', error);
    console.error('❌ ERROR MESSAGE:', error.message);
    console.error('❌ ERROR NAME:', error.name);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: messages
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: `Error en el campo ${error.path}: valor inválido`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// @desc    Eliminar sucursal
// @route   DELETE /api/sucursales/:id
// @access  Private (Admin only)
const deleteSucursal = async (req, res) => {
  try {
    const { id } = req.params;

    const sucursal = await Sucursal.findById(id);
    
    if (!sucursal) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    // Verificar que no tenga alumnos activos
    if (sucursal.isActive) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una sucursal activa. Primero desactívala.'
      });
    }

    // Eliminar logo si existe
    if (sucursal.logo.filename) {
      try {
        const logoPath = path.join(__dirname, '../uploads/logos', sucursal.logo.filename);
        await fs.unlink(logoPath);
      } catch (error) {
        console.error('Error eliminando logo:', error);
      }
    }

    await Sucursal.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Sucursal eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando sucursal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Subir logo de sucursal
// @route   POST /api/sucursales/:id/logo
// @access  Private (Admin or Manager)
const uploadLogo = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📤 Subiendo logo para sucursal:', id);
    console.log('📁 Archivo recibido:', req.file);

    const sucursal = await Sucursal.findById(id);
    
    if (!sucursal) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    // Verificar permisos
    const canEdit = req.user.role === 'admin' || 
                   sucursal.manager?.toString() === req.user._id.toString();
    
    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para subir logo a esta sucursal'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo'
      });
    }

    // Eliminar logo anterior si existe
    if (sucursal.logo.filename) {
      try {
        const oldLogoPath = path.join(__dirname, '../uploads/logos', sucursal.logo.filename);
        await fs.unlink(oldLogoPath);
        console.log('✅ Logo anterior eliminado');
      } catch (error) {
        console.error('⚠️ Error eliminando logo anterior:', error);
      }
    }

    // Actualizar información del logo
    sucursal.logo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/logos/${req.file.filename}`
    };

    await sucursal.save();

    console.log('✅ Logo guardado exitosamente');
    console.log('  - logoUrl:', sucursal.logoUrl);

    res.json({
      success: true,
      message: 'Logo subido exitosamente',
      data: {
        logoUrl: sucursal.logoUrl,
        logo: sucursal.logo
      }
    });

  } catch (error) {
    console.error('❌ Error subiendo logo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// @desc    Obtener estadísticas de sucursal
// @route   GET /api/sucursales/:id/stats
// @access  Private (Admin or Manager)
const getSucursalStats = async (req, res) => {
  try {
    const { id } = req.params;

    const sucursal = await Sucursal.findById(id);
    
    if (!sucursal) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    // Verificar permisos
    const canView = req.user.role === 'admin' || 
                   sucursal.manager?.toString() === req.user._id.toString();
    
    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver las estadísticas de esta sucursal'
      });
    }

    // Actualizar y obtener estadísticas
    const stats = await sucursal.updateStats();

    res.json({
      success: true,
      data: {
        stats,
        capacity: sucursal.capacity,
        capacityUsed: sucursal.capacityUsed,
        isOpenNow: sucursal.isOpenNow
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getSucursales,
  getSucursalById,
  createSucursal,
  updateSucursal,
  deleteSucursal,
  uploadLogo,
  getSucursalStats
};