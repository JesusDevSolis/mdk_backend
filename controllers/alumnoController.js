const Alumno = require('../models/Alumno');
const Tutor = require('../models/Tutor');
const Sucursal = require('../models/Sucursal');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// @desc    Obtener todos los alumnos
// @route   GET /api/alumnos
// @access  Private (Admin, Instructor)
const getAlumnos = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search,
      sucursal,
      status,
      belt,
      isActive,
      tutor,
      age,
      orderBy = 'createdAt',
      order = 'desc'
    } = req.query;

    // Construir filtros
    const filters = {};
    
    // Filtro por estado activo
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    
    // Filtro por estado de matrícula
    if (status) {
      filters['enrollment.status'] = status;
    }
    
    // Filtro por sucursal
    if (sucursal) {
      filters['enrollment.sucursal'] = sucursal;
    }
    
    // Filtro por cinturón
    if (belt) {
      filters['belt.level'] = belt;
    }
    
    // Filtro por tutor
    if (tutor) {
      filters.tutor = tutor;
    }
    
    // Búsqueda por nombre, email, teléfono o studentId
    if (search) {
      filters.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { 'enrollment.studentId': { $regex: search, $options: 'i' } }
      ];
    }

    // Si el usuario no es admin, aplicar filtros según rol
    if (req.user.role !== 'admin') {
      if (req.user.role === 'instructor') {
        // Los instructores solo pueden ver alumnos de sus sucursales
        const sucursales = await Sucursal.find({ 
          manager: req.user._id,
          isActive: true 
        }).select('_id');
        
        const sucursalIds = sucursales.map(s => s._id);
        filters['enrollment.sucursal'] = { $in: sucursalIds };
      }
    }

    // Filtro por edad (requiere agregación)
    let useAggregation = false;
    let ageFilter = {};
    
    if (age) {
      useAggregation = true;
      const [minAge, maxAge] = age.split('-').map(Number);
      const today = new Date();
      
      if (maxAge) {
        // Rango de edad
        const minDate = new Date(today.getFullYear() - maxAge - 1, today.getMonth(), today.getDate());
        const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
        ageFilter = { $gte: minDate, $lte: maxDate };
      } else {
        // Edad mínima
        const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
        ageFilter = { $lte: maxDate };
      }
    }

    // Calcular skip para paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let alumnos, total;

    if (useAggregation) {
      // Usar agregación para filtros complejos
      const pipeline = [
        { $match: { ...filters, dateOfBirth: ageFilter } },
        {
          $lookup: {
            from: 'sucursals',
            localField: 'enrollment.sucursal',
            foreignField: '_id',
            as: 'sucursalInfo'
          }
        },
        {
          $lookup: {
            from: 'tutors',
            localField: 'tutor',
            foreignField: '_id',
            as: 'tutorInfo'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'belt.certifiedBy',
            foreignField: '_id',
            as: 'certifierInfo'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'creatorInfo'
          }
        },
        { $sort: { [orderBy]: order === 'desc' ? -1 : 1 } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ];

      alumnos = await Alumno.aggregate(pipeline);
      total = await Alumno.countDocuments({ ...filters, dateOfBirth: ageFilter });
    } else {
      // Búsqueda normal con populate
      const sortObj = {};
      sortObj[orderBy] = order === 'desc' ? -1 : 1;

      alumnos = await Alumno.find(filters)
        .populate('enrollment.sucursal', 'name address')
        .populate('tutor', 'firstName lastName email phones.primary')
        .populate('belt.certifiedBy', 'name')
        .populate('createdBy', 'name email')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit));

      total = await Alumno.countDocuments(filters);
    }

    // Convertir a datos públicos
    const alumnosPublicos = alumnos.map(alumno => {
        if (typeof alumno.getPublicInfo === 'function') {
            return alumno.getPublicInfo();
        } else {
            return {
            _id: alumno._id,
            fullName: `${alumno.firstName} ${alumno.lastName}`,
            firstName: alumno.firstName,
            lastName: alumno.lastName,
            
            // ✅ AGREGAR CAMPOS FALTANTES:
            dateOfBirth: alumno.dateOfBirth,
            age: alumno.age || (() => {
                // Calcular edad si no está disponible
                if (!alumno.dateOfBirth) return null;
                const today = new Date();
                const birthDate = new Date(alumno.dateOfBirth);
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
                }
                return age;
            })(),
            gender: alumno.gender,
            
            email: alumno.email,
            phone: alumno.phone,
            
            // ✅ AGREGAR CAMPOS ADICIONALES:
            address: alumno.address,
            relationshipToTutor: alumno.relationshipToTutor,
            emergencyContact: alumno.emergencyContact,
            medicalInfo: alumno.medicalInfo,
            preferences: alumno.preferences,
            notes: alumno.notes,
            
            belt: alumno.belt,
            enrollment: alumno.enrollment,
            stats: alumno.stats,
            
            // ✅ AGREGAR CAMPOS DE FOTO:
            profilePhoto: alumno.profilePhoto,
            profilePhotoUrl: (() => {
                if (alumno.profilePhoto && alumno.profilePhoto.url) {
                if (alumno.profilePhoto.url.startsWith('http')) {
                    return alumno.profilePhoto.url;
                }
                const baseUrl = process.env.BASE_URL || 'http://localhost:3005';
                return `${baseUrl}${alumno.profilePhoto.url}`;
                }
                return null;
            })(),
            
            isActive: alumno.isActive,
            createdAt: alumno.createdAt,
            updatedAt: alumno.updatedAt,
            
            // Referencias pobladas
            sucursalInfo: alumno.sucursalInfo?.[0],
            tutorInfo: alumno.tutorInfo?.[0]
            };
        }
    });

    res.json({
      success: true,
      data: {
        alumnos: alumnosPublicos,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo alumnos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener alumno por ID
// @route   GET /api/alumnos/:id
// @access  Private
const getAlumnoById = async (req, res) => {
  try {
    const { id } = req.params;

    const alumno = await Alumno.findById(id)
      .populate('enrollment.sucursal', 'name address phone email')
      .populate('tutor')
      .populate('belt.certifiedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    if (!alumno) {
      return res.status(404).json({
        success: false,
        message: 'Alumno no encontrado'
      });
    }

    // Verificar permisos
    const canView = req.user.role === 'admin' || await canAccessAlumno(req.user, alumno);
    
    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este alumno'
      });
    }

    res.json({
      success: true,
      data: {
        alumno: alumno.getFullInfo()
      }
    });

  } catch (error) {
    console.error('Error obteniendo alumno:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Crear nuevo alumno
// @route   POST /api/alumnos
// @access  Private (Admin, Instructor)
const createAlumno = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      tutor,
      relationshipToTutor,
      emergencyContact,
      medicalInfo,
      enrollment,
      belt,
      preferences,
      notes
    } = req.body;

    // Verificar que el email no exista (si se proporciona)
    if (email) {
      const existingAlumno = await Alumno.findOne({ email });
      if (existingAlumno) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un alumno con este email'
        });
      }
    }

    // Verificar que la sucursal exista y esté activa
    const sucursal = await Sucursal.findById(enrollment.sucursal);
    if (!sucursal || !sucursal.isActive) {
      return res.status(400).json({
        success: false,
        message: 'La sucursal especificada no existe o no está activa'
      });
    }

    // Verificar permisos para la sucursal
    if (req.user.role !== 'admin') {
      const canManageSucursal = sucursal.manager?.toString() === req.user._id.toString();
      if (!canManageSucursal) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para registrar alumnos en esta sucursal'
        });
      }
    }

    // Validar tutor si se proporciona
    if (tutor) {
      const tutorData = await Tutor.findById(tutor);
      if (!tutorData || !tutorData.isActive) {
        return res.status(400).json({
          success: false,
          message: 'El tutor especificado no existe o no está activo'
        });
      }
    }

    // Verificar instructor certificador del cinturón
    if (belt?.certifiedBy) {
      const User = require('../models/User');
      const instructor = await User.findById(belt.certifiedBy);
      if (!instructor || !['admin', 'instructor'].includes(instructor.role)) {
        return res.status(400).json({
          success: false,
          message: 'El certificador debe ser un instructor válido'
        });
      }
    }

    // Crear alumno
    const alumnoData = {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      tutor,
      relationshipToTutor,
      emergencyContact,
      medicalInfo,
      enrollment: {
        ...enrollment,
        monthlyFee: enrollment.monthlyFee || sucursal.settings?.monthlyFee || 0,
        registrationFee: enrollment.registrationFee || sucursal.settings?.registrationFee || 0
      },
      belt: belt || { level: 'blanco', dateObtained: new Date() },
      preferences,
      notes,
      createdBy: req.user._id
    };

    const alumno = new Alumno(alumnoData);
    await alumno.save();

    // Poblar datos antes de enviar respuesta
    await alumno.populate('enrollment.sucursal', 'name');
    await alumno.populate('tutor', 'firstName lastName email');
    await alumno.populate('createdBy', 'name email');

    // Actualizar estadísticas de la sucursal
    await updateSucursalStats(enrollment.sucursal);

    res.status(201).json({
      success: true,
      message: 'Alumno registrado exitosamente',
      data: {
        alumno: alumno.getPublicInfo()
      }
    });

  } catch (error) {
    console.error('Error creando alumno:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: messages
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'El email ya existe'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Actualizar alumno
// @route   PUT /api/alumnos/:id
// @access  Private (Admin, Instructor)
const updateAlumno = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      tutor,
      relationshipToTutor,
      emergencyContact,
      medicalInfo,
      enrollment,
      belt,
      preferences,
      notes,
      isActive
    } = req.body;

    const alumno = await Alumno.findById(id);
    
    if (!alumno) {
      return res.status(404).json({
        success: false,
        message: 'Alumno no encontrado'
      });
    }

    // Verificar permisos
    const canEdit = req.user.role === 'admin' || await canAccessAlumno(req.user, alumno);
    
    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para editar este alumno'
      });
    }

    // Verificar email único si se está cambiando
    if (email && email !== alumno.email) {
      const existingAlumno = await Alumno.findOne({ 
        email, 
        _id: { $ne: id } 
      });
      
      if (existingAlumno) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un alumno con este email'
        });
      }
    }

    // Validar tutor si se está cambiando
    if (tutor && tutor !== alumno.tutor?.toString()) {
      const tutorData = await Tutor.findById(tutor);
      if (!tutorData || !tutorData.isActive) {
        return res.status(400).json({
          success: false,
          message: 'El tutor especificado no existe o no está activo'
        });
      }
    }

    // Validar sucursal si se está cambiando
    if (enrollment?.sucursal && enrollment.sucursal !== alumno.enrollment.sucursal?.toString()) {
      const sucursal = await Sucursal.findById(enrollment.sucursal);
      if (!sucursal || !sucursal.isActive) {
        return res.status(400).json({
          success: false,
          message: 'La sucursal especificada no existe o no está activa'
        });
      }

      // Verificar permisos para la nueva sucursal
      if (req.user.role !== 'admin') {
        const canManageSucursal = sucursal.manager?.toString() === req.user._id.toString();
        if (!canManageSucursal) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para transferir alumnos a esta sucursal'
          });
        }
      }
    }

    // Actualizar campos
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (gender !== undefined) updateData.gender = gender;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (tutor !== undefined) updateData.tutor = tutor;
    if (relationshipToTutor !== undefined) updateData.relationshipToTutor = relationshipToTutor;
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
    if (medicalInfo !== undefined) updateData.medicalInfo = medicalInfo;
    if (enrollment !== undefined) updateData.enrollment = { ...alumno.enrollment.toObject(), ...enrollment };
    if (belt !== undefined) updateData.belt = { ...alumno.belt.toObject(), ...belt };
    if (preferences !== undefined) updateData.preferences = preferences;
    if (notes !== undefined) updateData.notes = notes;
    
    // Solo admin puede cambiar isActive
    if (req.user.role === 'admin' && isActive !== undefined) {
      updateData.isActive = isActive;
    }

    updateData.lastModifiedBy = req.user._id;

    const oldSucursalId = alumno.enrollment.sucursal;
    const newSucursalId = updateData.enrollment?.sucursal;

    const updatedAlumno = await Alumno.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('enrollment.sucursal', 'name')
     .populate('tutor', 'firstName lastName email')
     .populate('belt.certifiedBy', 'name')
     .populate('createdBy', 'name email')
     .populate('lastModifiedBy', 'name email');

    // Actualizar estadísticas de sucursales si cambió
    if (newSucursalId && newSucursalId !== oldSucursalId.toString()) {
      await updateSucursalStats(oldSucursalId);
      await updateSucursalStats(newSucursalId);
    } else if (oldSucursalId) {
      await updateSucursalStats(oldSucursalId);
    }

    res.json({
      success: true,
      message: 'Alumno actualizado exitosamente',
      data: {
        alumno: updatedAlumno.getPublicInfo()
      }
    });

  } catch (error) {
    console.error('Error actualizando alumno:', error);
    
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

// @desc    Eliminar alumno
// @route   DELETE /api/alumnos/:id
// @access  Private (Admin only)
const deleteAlumno = async (req, res) => {
  try {
    const { id } = req.params;

    const alumno = await Alumno.findById(id);
    
    if (!alumno) {
      return res.status(404).json({
        success: false,
        message: 'Alumno no encontrado'
      });
    }

    // Solo permitir eliminación si está inactivo
    if (alumno.enrollment.status === 'activo') {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar un alumno activo. Primero desactívalo.'
      });
    }

    const sucursalId = alumno.enrollment.sucursal;

    // Eliminar foto si existe
    if (alumno.profilePhoto.filename) {
      try {
        const photoPath = path.join(__dirname, '../uploads/profiles', alumno.profilePhoto.filename);
        await fs.unlink(photoPath);
      } catch (error) {
        console.error('Error eliminando foto:', error);
      }
    }

    await Alumno.findByIdAndDelete(id);

    // Actualizar estadísticas de la sucursal
    await updateSucursalStats(sucursalId);

    res.json({
      success: true,
      message: 'Alumno eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando alumno:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Subir foto de perfil de alumno
// @route   POST /api/alumnos/:id/photo
// @access  Private (Admin, Instructor)
const uploadPhoto = async (req, res) => {
  try {
    const { id } = req.params;

    const alumno = await Alumno.findById(id);
    
    if (!alumno) {
      return res.status(404).json({
        success: false,
        message: 'Alumno no encontrado'
      });
    }

    // Verificar permisos
    const canEdit = req.user.role === 'admin' || await canAccessAlumno(req.user, alumno);
    
    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para subir foto a este alumno'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo'
      });
    }

    // Eliminar foto anterior si existe
    if (alumno.profilePhoto.filename) {
      try {
        const oldPhotoPath = path.join(__dirname, '../uploads/profiles', alumno.profilePhoto.filename);
        await fs.unlink(oldPhotoPath);
      } catch (error) {
        console.error('Error eliminando foto anterior:', error);
      }
    }

    // Actualizar información de la foto
    alumno.profilePhoto = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/profiles/${req.file.filename}`
    };

    await alumno.save();

    res.json({
      success: true,
      message: 'Foto subida exitosamente',
      data: {
        photoUrl: alumno.profilePhotoUrl,
        photo: alumno.profilePhoto
      }
    });

  } catch (error) {
    console.error('Error subiendo foto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Actualizar cinturón de alumno
// @route   PUT /api/alumnos/:id/belt
// @access  Private (Admin, Instructor)
const updateBelt = async (req, res) => {
  try {
    const { id } = req.params;
    const { level, dateObtained, certifiedBy } = req.body;

    const alumno = await Alumno.findById(id);
    
    if (!alumno) {
      return res.status(404).json({
        success: false,
        message: 'Alumno no encontrado'
      });
    }

    // Verificar permisos
    const canEdit = req.user.role === 'admin' || await canAccessAlumno(req.user, alumno);
    
    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para actualizar el cinturón de este alumno'
      });
    }

    // Validar instructor certificador
    if (certifiedBy) {
      const User = require('../models/User');
      const instructor = await User.findById(certifiedBy);
      if (!instructor || !['admin', 'instructor'].includes(instructor.role)) {
        return res.status(400).json({
          success: false,
          message: 'El certificador debe ser un instructor válido'
        });
      }
    }

    // Actualizar cinturón
    alumno.belt = {
      level: level || alumno.belt.level,
      dateObtained: dateObtained || new Date(),
      certifiedBy: certifiedBy || req.user._id
    };

    await alumno.save();
    await alumno.populate('belt.certifiedBy', 'name');

    res.json({
      success: true,
      message: 'Cinturón actualizado exitosamente',
      data: {
        belt: alumno.belt
      }
    });

  } catch (error) {
    console.error('Error actualizando cinturón:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener estadísticas generales de alumnos
// @route   GET /api/alumnos/stats
// @access  Private (Admin, Instructor)
const getAlumnosStats = async (req, res) => {
  try {
    const { sucursal } = req.query;
    
    let filters = { isActive: true };
    
    // Si se especifica sucursal, filtrar por ella
    if (sucursal) {
      filters['enrollment.sucursal'] = sucursal;
    }
    
    // Si no es admin, filtrar por sucursales que maneja
    if (req.user.role !== 'admin') {
      const sucursales = await Sucursal.find({ 
        manager: req.user._id,
        isActive: true 
      }).select('_id');
      
      const sucursalIds = sucursales.map(s => s._id);
      filters['enrollment.sucursal'] = { $in: sucursalIds };
    }

    const [
      totalAlumnos,
      alumnosActivos,
      alumnosInactivos,
      menoresEdad,
      mayoresEdad,
      estadisticasCinturones,
      estadisticasSucursales
    ] = await Promise.all([
      Alumno.countDocuments(filters),
      Alumno.countDocuments({ ...filters, 'enrollment.status': 'activo' }),
      Alumno.countDocuments({ ...filters, 'enrollment.status': { $ne: 'activo' } }),
      Alumno.countDocuments({ 
        ...filters, 
        dateOfBirth: { $gt: new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()) }
      }),
      Alumno.countDocuments({ 
        ...filters, 
        dateOfBirth: { $lte: new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()) }
      }),
      Alumno.aggregate([
        { $match: filters },
        { $group: { _id: '$belt.level', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Alumno.aggregate([
        { $match: filters },
        {
          $lookup: {
            from: 'sucursals',
            localField: 'enrollment.sucursal',
            foreignField: '_id',
            as: 'sucursalInfo'
          }
        },
        { $unwind: '$sucursalInfo' },
        { $group: { _id: '$enrollment.sucursal', name: { $first: '$sucursalInfo.name' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        resumen: {
          totalAlumnos,
          alumnosActivos,
          alumnosInactivos,
          menoresEdad,
          mayoresEdad
        },
        cinturones: estadisticasCinturones,
        sucursales: estadisticasSucursales
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

// Función auxiliar para verificar acceso a alumno
const canAccessAlumno = async (user, alumno) => {
  if (user.role === 'admin') return true;
  
  if (user.role === 'instructor') {
    // Verificar si el instructor maneja la sucursal del alumno
    const sucursal = await Sucursal.findById(alumno.enrollment.sucursal);
    return sucursal && sucursal.manager?.toString() === user._id.toString();
  }
  
  return false;
};

// Función auxiliar para actualizar estadísticas de sucursal
const updateSucursalStats = async (sucursalId) => {
  try {
    const [totalStudents, activeStudents] = await Promise.all([
      Alumno.countDocuments({ 'enrollment.sucursal': sucursalId, isActive: true }),
      Alumno.countDocuments({ 'enrollment.sucursal': sucursalId, isActive: true, 'enrollment.status': 'activo' })
    ]);

    await Sucursal.findByIdAndUpdate(sucursalId, {
      'stats.totalStudents': totalStudents,
      'stats.activeStudents': activeStudents,
      'stats.lastUpdated': new Date()
    });
  } catch (error) {
    console.error('Error actualizando estadísticas de sucursal:', error);
  }
};

module.exports = {
  getAlumnos,
  getAlumnoById,
  createAlumno,
  updateAlumno,
  deleteAlumno,
  uploadPhoto,
  updateBelt,
  getAlumnosStats
};