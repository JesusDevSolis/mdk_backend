const Payment = require('../models/Payments');
const Alumno = require('../models/Alumno');
const Tutor = require('../models/Tutor');
const Sucursal = require('../models/Sucursal');
const mongoose = require('mongoose');

// ===== OBTENER TODOS LOS PAGOS =====
exports.getAllPayments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      type, 
      alumno, 
      tutor, 
      sucursal,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Construir filtros
    const filters = { isActive: true };

    if (status) filters.status = status;
    if (type) filters.type = type;
    if (alumno) filters.alumno = alumno;
    if (tutor) filters.tutor = tutor;
    if (sucursal) filters.sucursal = sucursal;

    // Filtro por rango de fechas
    if (startDate || endDate) {
      filters.dueDate = {};
      if (startDate) filters.dueDate.$gte = new Date(startDate);
      if (endDate) filters.dueDate.$lte = new Date(endDate);
    }

    // Búsqueda por número de recibo o referencia
    if (search) {
      filters.$or = [
        { receiptNumber: { $regex: search, $options: 'i' } },
        { paymentReference: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Calcular skip para paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Construir sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Ejecutar query con paginación
    const payments = await Payment.find(filters)
      .populate('alumno', 'firstName lastName enrollment.studentId email phone')
      .populate('tutor', 'firstName lastName email phones.primary')
      .populate('sucursal', 'name address.city')
      .populate('createdBy', 'name email')
      .populate('paidBy', 'name')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    // Contar total de documentos
    const total = await Payment.countDocuments(filters);

    // Calcular información de paginación
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      data: payments.map(p => p.getPublicInfo()),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los pagos',
      error: error.message
    });
  }
};

// ===== OBTENER PAGO POR ID =====
exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pago inválido'
      });
    }

    const payment = await Payment.findById(id)
      .populate('alumno', 'firstName lastName enrollment.studentId email phone dateOfBirth gender')
      .populate('tutor', 'firstName lastName email phones identification')
      .populate('sucursal', 'name address contact')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name')
      .populate('paidBy', 'name')
      .populate('receiptFile.uploadedBy', 'name');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error al obtener pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el pago',
      error: error.message
    });
  }
};

// ===== CREAR NUEVO PAGO =====
exports.createPayment = async (req, res) => {
  try {
    const {
      alumno,
      tutor,
      sucursal,
      type,
      description,
      amount,
      discount,
      dueDate,
      period,
      notes
    } = req.body;

    // Validar que el alumno existe
    const alumnoExists = await Alumno.findById(alumno);
    if (!alumnoExists) {
      return res.status(404).json({
        success: false,
        message: 'Alumno no encontrado'
      });
    }

    // Validar que la sucursal existe
    const sucursalExists = await Sucursal.findById(sucursal);
    if (!sucursalExists) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    // Si se proporciona tutor, validar que existe
    if (tutor) {
      const tutorExists = await Tutor.findById(tutor);
      if (!tutorExists) {
        return res.status(404).json({
          success: false,
          message: 'Tutor no encontrado'
        });
      }
    }

    // Si es colegiatura, verificar que no exista ya un pago para ese periodo
    if (type === 'colegiatura' && period && period.month && period.year) {
      const existingPayment = await Payment.findOne({
        alumno,
        type: 'colegiatura',
        'period.month': period.month,
        'period.year': period.year,
        status: { $ne: 'cancelado' },
        isActive: true
      });

      if (existingPayment) {
        return res.status(400).json({
          success: false,
          message: `Ya existe un pago de colegiatura para ${period.month}/${period.year}`
        });
      }
    }

    // Crear el pago
    const payment = new Payment({
      alumno,
      tutor: tutor || alumnoExists.tutor, // Usar tutor del alumno si no se proporciona
      sucursal,
      type,
      description,
      amount,
      discount: discount || 0,
      dueDate,
      period,
      notes,
      createdBy: req.user._id
    });

    await payment.save();

    // Obtener el pago completo con populate
    const paymentPopulated = await Payment.findById(payment._id)
      .populate('alumno', 'firstName lastName enrollment.studentId')
      .populate('tutor', 'firstName lastName email phones.primary')
      .populate('sucursal', 'name')
      .populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      message: 'Pago creado exitosamente',
      data: paymentPopulated.getPublicInfo()
    });
  } catch (error) {
    console.error('Error al crear pago:', error);
    
    // Manejo de errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear el pago',
      error: error.message
    });
  }
};

// ===== ACTUALIZAR PAGO =====
exports.updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pago inválido'
      });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    // No permitir actualizar pagos ya pagados (solo admin puede)
    if (payment.status === 'pagado' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No se pueden modificar pagos ya realizados'
      });
    }

    // Actualizar campos permitidos
    const allowedFields = [
      'type', 'description', 'amount', 'discount', 
      'dueDate', 'period', 'notes'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        payment[field] = updateData[field];
      }
    });

    payment.lastModifiedBy = req.user._id;

    await payment.save();

    // Obtener el pago actualizado con populate
    const paymentUpdated = await Payment.findById(payment._id)
      .populate('alumno', 'firstName lastName enrollment.studentId')
      .populate('tutor', 'firstName lastName email phones.primary')
      .populate('sucursal', 'name')
      .populate('createdBy', 'name')
      .populate('lastModifiedBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Pago actualizado exitosamente',
      data: paymentUpdated.getPublicInfo()
    });
  } catch (error) {
    console.error('Error al actualizar pago:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al actualizar el pago',
      error: error.message
    });
  }
};

// ===== ELIMINAR PAGO (SOFT DELETE) =====
exports.deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pago inválido'
      });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    // No permitir eliminar pagos ya pagados
    if (payment.status === 'pagado' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No se pueden eliminar pagos ya realizados. Considere cancelarlo.'
      });
    }

    // Soft delete
    payment.isActive = false;
    payment.lastModifiedBy = req.user._id;
    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Pago eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el pago',
      error: error.message
    });
  }
};

// ===== MARCAR PAGO COMO PAGADO =====
exports.markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { paidDate, paymentMethod, paymentReference, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pago inválido'
      });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    if (payment.status === 'pagado') {
      return res.status(400).json({
        success: false,
        message: 'El pago ya está marcado como pagado'
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'El método de pago es requerido'
      });
    }

    // Marcar como pagado usando el método del modelo
    await payment.markAsPaid({
      paidDate: paidDate || new Date(),
      paymentMethod,
      paymentReference
    }, req.user._id);

    if (notes) {
      payment.notes = notes;
      await payment.save();
    }

    // Obtener el pago actualizado
    const paymentUpdated = await Payment.findById(payment._id)
      .populate('alumno', 'firstName lastName enrollment.studentId')
      .populate('tutor', 'firstName lastName email phones.primary')
      .populate('sucursal', 'name')
      .populate('paidBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Pago marcado como pagado exitosamente',
      data: paymentUpdated.getPublicInfo()
    });
  } catch (error) {
    console.error('Error al marcar pago como pagado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar el pago como pagado',
      error: error.message
    });
  }
};

// ===== CANCELAR PAGO =====
exports.cancelPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pago inválido'
      });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    if (payment.status === 'cancelado') {
      return res.status(400).json({
        success: false,
        message: 'El pago ya está cancelado'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar una razón para cancelar el pago'
      });
    }

    // Cancelar usando el método del modelo
    await payment.cancel(req.user._id, reason);

    const paymentUpdated = await Payment.findById(payment._id)
      .populate('alumno', 'firstName lastName enrollment.studentId')
      .populate('sucursal', 'name')
      .populate('lastModifiedBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Pago cancelado exitosamente',
      data: paymentUpdated.getPublicInfo()
    });
  } catch (error) {
    console.error('Error al cancelar pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar el pago',
      error: error.message
    });
  }
};

// ===== OBTENER PAGOS PENDIENTES =====
exports.getPendingPayments = async (req, res) => {
  try {
    const { sucursal, alumno } = req.query;

    const filters = {};
    if (sucursal) filters.sucursal = sucursal;
    if (alumno) filters.alumno = alumno;

    const payments = await Payment.findPending(filters);

    res.status(200).json({
      success: true,
      data: payments.map(p => p.getPublicInfo()),
      count: payments.length
    });
  } catch (error) {
    console.error('Error al obtener pagos pendientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pagos pendientes',
      error: error.message
    });
  }
};

// ===== OBTENER PAGOS VENCIDOS =====
exports.getOverduePayments = async (req, res) => {
  try {
    const { sucursal, alumno } = req.query;

    const filters = {};
    if (sucursal) filters.sucursal = sucursal;
    if (alumno) filters.alumno = alumno;

    const payments = await Payment.findOverdue(filters);

    res.status(200).json({
      success: true,
      data: payments.map(p => p.getPublicInfo()),
      count: payments.length
    });
  } catch (error) {
    console.error('Error al obtener pagos vencidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pagos vencidos',
      error: error.message
    });
  }
};

// ===== OBTENER PAGOS POR ALUMNO =====
exports.getPaymentsByAlumno = async (req, res) => {
  try {
    const { alumnoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(alumnoId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de alumno inválido'
      });
    }

    const payments = await Payment.findByAlumno(alumnoId);

    res.status(200).json({
      success: true,
      data: payments.map(p => p.getPublicInfo()),
      count: payments.length
    });
  } catch (error) {
    console.error('Error al obtener pagos por alumno:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pagos del alumno',
      error: error.message
    });
  }
};

// ===== OBTENER PAGOS POR TUTOR =====
exports.getPaymentsByTutor = async (req, res) => {
  try {
    const { tutorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tutorId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de tutor inválido'
      });
    }

    const payments = await Payment.findByTutor(tutorId);

    res.status(200).json({
      success: true,
      data: payments.map(p => p.getPublicInfo()),
      count: payments.length
    });
  } catch (error) {
    console.error('Error al obtener pagos por tutor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pagos del tutor',
      error: error.message
    });
  }
};

// ===== OBTENER ESTADÍSTICAS DE PAGOS =====
exports.getPaymentStats = async (req, res) => {
  try {
    const { sucursal, startDate, endDate } = req.query;

    const filters = {};
    if (sucursal) filters.sucursal = mongoose.Types.ObjectId(sucursal);
    
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    // Obtener estadísticas generales
    const stats = await Payment.getStats(filters);

    // Obtener estadísticas por tipo de pago
    const statsByType = await Payment.aggregate([
      { $match: { isActive: true, ...filters } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          total: { $sum: '$total' }
        }
      }
    ]);

    // Obtener estadísticas por mes
    const statsByMonth = await Payment.aggregate([
      { $match: { isActive: true, status: 'pagado', ...filters } },
      {
        $group: {
          _id: {
            year: { $year: '$paidDate' },
            month: { $month: '$paidDate' }
          },
          count: { $sum: 1 },
          total: { $sum: '$total' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        general: stats,
        byType: statsByType,
        byMonth: statsByMonth
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de pagos',
      error: error.message
    });
  }
};

// ===== SUBIR COMPROBANTE DE PAGO =====
exports.uploadReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pago inválido'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ningún archivo'
      });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    // Actualizar información del comprobante
    payment.receiptFile = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/documents/${req.file.filename}`,
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    };

    await payment.save();

    const paymentUpdated = await Payment.findById(payment._id)
      .populate('alumno', 'firstName lastName')
      .populate('receiptFile.uploadedBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Comprobante subido exitosamente',
      data: paymentUpdated.getPublicInfo()
    });
  } catch (error) {
    console.error('Error al subir comprobante:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir el comprobante',
      error: error.message
    });
  }
};

module.exports = exports;