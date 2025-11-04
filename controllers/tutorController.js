const Tutor = require('../models/Tutor');
const Alumno = require('../models/Alumno');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// @desc    Obtener todos los tutores
// @route   GET /api/tutores
// @access  Private (Admin, Instructor)
const getTutores = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search,
      isActive,
      hasChildren
    } = req.query;

    // Construir filtros
    const filters = {};
    
    // Filtro por estado activo
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    
    // Búsqueda por nombre, email o teléfono
    if (search) {
      filters.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'phones.primary': { $regex: search, $options: 'i' } },
        { 'identification.number': { $regex: search, $options: 'i' } }
      ];
    }

    // Si el usuario no es admin, aplicar filtros adicionales según rol
    if (req.user.role !== 'admin') {
      // Los instructores solo pueden ver tutores de sus sucursales
      if (req.user.role === 'instructor') {
        // Obtener sucursales donde el instructor es manager
        const Sucursal = require('../models/Sucursal');
        const sucursales = await Sucursal.find({ 
          manager: req.user._id,
          isActive: true 
        }).select('_id');
        
        const sucursalIds = sucursales.map(s => s._id);
        
        // Buscar alumnos de esas sucursales y obtener sus tutores
        const alumnos = await Alumno.find({
          'enrollment.sucursal': { $in: sucursalIds },
          tutor: { $exists: true }
        }).select('tutor');
        
        const tutorIds = [...new Set(alumnos.map(a => a.tutor))];
        filters._id = { $in: tutorIds };
      }
    }

    // Calcular skip para paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Buscar tutores con populate
    let query = Tutor.find(filters)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const tutores = await query;
    const total = await Tutor.countDocuments(filters);

    // Si se solicita filtro por "con hijos", agregar el conteo
    let tutoresResult = tutores;
    if (hasChildren !== undefined) {
      const tutoresConConteo = await Promise.all(
        tutores.map(async (tutor) => {
          const childrenCount = await Alumno.countDocuments({
            tutor: tutor._id,
            isActive: true
          });
          
          const tutorObj = tutor.toObject();
          tutorObj.childrenCount = childrenCount;
          
          return tutorObj;
        })
      );
      
      // Filtrar según hasChildren
      if (hasChildren === 'true') {
        tutoresResult = tutoresConConteo.filter(t => t.childrenCount > 0);
      } else if (hasChildren === 'false') {
        tutoresResult = tutoresConConteo.filter(t => t.childrenCount === 0);
      } else {
        tutoresResult = tutoresConConteo;
      }
    }

    // Convertir a datos públicos
    const tutoresPublicos = tutoresResult.map(tutor => 
      typeof tutor.getPublicInfo === 'function' 
        ? tutor.getPublicInfo() 
        : tutor
    );

    res.json({
      success: true,
      data: {
        tutores: tutoresPublicos,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo tutores:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener tutor por ID
// @route   GET /api/tutores/:id
// @access  Private
const getTutorById = async (req, res) => {
  try {
    const { id } = req.params;

    const tutor = await Tutor.findById(id)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor no encontrado'
      });
    }

    // Verificar permisos
    const canView = req.user.role === 'admin' || await canAccessTutor(req.user, tutor);
    
    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este tutor'
      });
    }

    // Obtener hijos del tutor
    const hijos = await Alumno.find({
      tutor: tutor._id,
      isActive: true
    }).populate('enrollment.sucursal', 'name')
      .select('firstName lastName age belt enrollment profilePhotoUrl');

    const tutorInfo = tutor.getFullInfo();
    tutorInfo.children = hijos.map(hijo => hijo.getPublicInfo());
    tutorInfo.childrenCount = hijos.length;

    res.json({
      success: true,
      data: {
        tutor: tutorInfo
      }
    });

  } catch (error) {
    console.error('Error obteniendo tutor:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Crear nuevo tutor
// @route   POST /api/tutores
// @access  Private (Admin, Instructor)
const createTutor = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      identification,
      email,
      phones,
      address,
      occupation,
      maritalStatus,
      emergencyContact,
      preferences,
      paymentInfo,
      notes
    } = req.body;

    // Verificar que el email no exista
    const existingTutor = await Tutor.findOne({ email });
    if (existingTutor) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un tutor con este email'
      });
    }

    // Verificar que el número de identificación no exista
    const existingIdentification = await Tutor.findOne({ 
      'identification.number': identification.number 
    });
    if (existingIdentification) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un tutor con este número de identificación'
      });
    }

    // Crear tutor
    const tutorData = {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      identification,
      email,
      phones,
      address,
      occupation,
      maritalStatus,
      emergencyContact,
      preferences,
      paymentInfo,
      notes,
      createdBy: req.user._id
    };

    const tutor = new Tutor(tutorData);
    await tutor.save();

    // Poblar datos antes de enviar respuesta
    await tutor.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Tutor creado exitosamente',
      data: {
        tutor: tutor.getPublicInfo()
      }
    });

  } catch (error) {
    console.error('Error creando tutor:', error);
    
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
        message: 'El email o número de identificación ya existe'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Actualizar tutor
// @route   PUT /api/tutores/:id
// @access  Private (Admin, Instructor)
const updateTutor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      identification,
      email,
      phones,
      address,
      occupation,
      maritalStatus,
      emergencyContact,
      preferences,
      paymentInfo,
      notes,
      isActive
    } = req.body;

    const tutor = await Tutor.findById(id);
    
    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor no encontrado'
      });
    }

    // Verificar permisos
    const canEdit = req.user.role === 'admin' || await canAccessTutor(req.user, tutor);
    
    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para editar este tutor'
      });
    }

    // Verificar email único si se está cambiando
    if (email && email !== tutor.email) {
      const existingTutor = await Tutor.findOne({ 
        email, 
        _id: { $ne: id } 
      });
      
      if (existingTutor) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un tutor con este email'
        });
      }
    }

    // Verificar identificación única si se está cambiando
    if (identification?.number && identification.number !== tutor.identification.number) {
      const existingIdentification = await Tutor.findOne({ 
        'identification.number': identification.number,
        _id: { $ne: id } 
      });
      
      if (existingIdentification) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un tutor con este número de identificación'
        });
      }
    }

    // Actualizar campos
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (gender !== undefined) updateData.gender = gender;
    if (identification !== undefined) updateData.identification = identification;
    if (email !== undefined) updateData.email = email;
    if (phones !== undefined) updateData.phones = phones;
    if (address !== undefined) updateData.address = address;
    if (occupation !== undefined) updateData.occupation = occupation;
    if (maritalStatus !== undefined) updateData.maritalStatus = maritalStatus;
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
    if (preferences !== undefined) updateData.preferences = preferences;
    if (paymentInfo !== undefined) updateData.paymentInfo = paymentInfo;
    if (notes !== undefined) updateData.notes = notes;
    
    // Solo admin puede cambiar isActive
    if (req.user.role === 'admin' && isActive !== undefined) {
      updateData.isActive = isActive;
    }

    updateData.lastModifiedBy = req.user._id;

    const updatedTutor = await Tutor.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('lastModifiedBy', 'name email');

    res.json({
      success: true,
      message: 'Tutor actualizado exitosamente',
      data: {
        tutor: updatedTutor.getPublicInfo()
      }
    });

  } catch (error) {
    console.error('Error actualizando tutor:', error);
    
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

// @desc    Eliminar tutor
// @route   DELETE /api/tutores/:id
// @access  Private (Admin only)
const deleteTutor = async (req, res) => {
  try {
    const { id } = req.params;

    const tutor = await Tutor.findById(id);
    
    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor no encontrado'
      });
    }

    // Verificar que no tenga hijos activos
    const activeChildren = await Alumno.countDocuments({
      tutor: tutor._id,
      isActive: true,
      'enrollment.status': 'activo'
    });

    if (activeChildren > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar un tutor con ${activeChildren} hijo(s) activo(s). Primero desactiva o transfiere los alumnos.`
      });
    }

    // Eliminar foto si existe
    if (tutor.profilePhoto.filename) {
      try {
        const photoPath = path.join(__dirname, '../uploads/profiles', tutor.profilePhoto.filename);
        await fs.unlink(photoPath);
      } catch (error) {
        console.error('Error eliminando foto:', error);
      }
    }

    await Tutor.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Tutor eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando tutor:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Subir foto de perfil de tutor
// @route   POST /api/tutores/:id/photo
// @access  Private (Admin, Instructor)
const uploadPhoto = async (req, res) => {
  try {
    const { id } = req.params;

    const tutor = await Tutor.findById(id);
    
    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor no encontrado'
      });
    }

    // Verificar permisos
    const canEdit = req.user.role === 'admin' || await canAccessTutor(req.user, tutor);
    
    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para subir foto a este tutor'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo'
      });
    }

    // Eliminar foto anterior si existe
    if (tutor.profilePhoto.filename) {
      try {
        const oldPhotoPath = path.join(__dirname, '../uploads/profiles', tutor.profilePhoto.filename);
        await fs.unlink(oldPhotoPath);
      } catch (error) {
        console.error('Error eliminando foto anterior:', error);
      }
    }

    // Actualizar información de la foto
    tutor.profilePhoto = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/profiles/${req.file.filename}`
    };

    await tutor.save();

    res.json({
      success: true,
      message: 'Foto subida exitosamente',
      data: {
        photoUrl: tutor.profilePhotoUrl,
        photo: tutor.profilePhoto
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

// @desc    Obtener hijos de un tutor
// @route   GET /api/tutores/:id/children
// @access  Private
const getTutorChildren = async (req, res) => {
  try {
    const { id } = req.params;

    const tutor = await Tutor.findById(id);
    
    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor no encontrado'
      });
    }

    // Verificar permisos
    const canView = req.user.role === 'admin' || await canAccessTutor(req.user, tutor);
    
    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver los hijos de este tutor'
      });
    }

    const hijos = await Alumno.find({
      tutor: tutor._id,
      isActive: true
    }).populate('enrollment.sucursal', 'name')
      .populate('belt.certifiedBy', 'name')
      .sort({ 'enrollment.enrollmentDate': -1 });

    const hijosPublicos = hijos.map(hijo => hijo.getPublicInfo());

    res.json({
      success: true,
      data: {
        tutor: tutor.getPublicInfo(),
        children: hijosPublicos,
        childrenCount: hijosPublicos.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo hijos del tutor:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Función auxiliar para verificar acceso a tutor
const canAccessTutor = async (user, tutor) => {
  if (user.role === 'admin') return true;
  
  if (user.role === 'instructor') {
    // Verificar si el instructor maneja alguna sucursal donde estudian hijos del tutor
    const Sucursal = require('../models/Sucursal');
    const sucursales = await Sucursal.find({ 
      manager: user._id,
      isActive: true 
    }).select('_id');
    
    const sucursalIds = sucursales.map(s => s._id);
    
    const hasStudentsInManagedBranches = await Alumno.countDocuments({
      tutor: tutor._id,
      'enrollment.sucursal': { $in: sucursalIds },
      isActive: true
    });
    
    return hasStudentsInManagedBranches > 0;
  }
  
  return false;
};

module.exports = {
  getTutores,
  getTutorById,
  createTutor,
  updateTutor,
  deleteTutor,
  uploadPhoto,
  getTutorChildren
};