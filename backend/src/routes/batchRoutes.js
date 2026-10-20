const express = require('express');
const Batch = require('../models/Batch');
const User = require('../models/User');
const { success, created, notFound, badRequest } = require('../utils/apiResponse');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { tenant } = require('../middleware/tenant');

const router = express.Router();
router.use(protect, tenant);

router.get('/', async (req, res, next) => {
  try {
    const batches = await Batch.find({ centerId: req.centerId, isActive: true })
      .populate('teachers', 'name email')
      .populate('students', 'name email')
      .sort({ createdAt: -1 });
    return success(res, { batches });
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('centeradmin', 'teacher'), async (req, res, next) => {
  try {
    const { name, description, academicYear } = req.body;
    if (!name) return badRequest(res, 'Name required');
    const batch = await Batch.create({
      centerId: req.centerId,
      name,
      description: description || '',
      academicYear: academicYear || '',
      teachers: req.user.role === 'teacher' ? [req.user._id] : [],
    });
    return created(res, { batch }, 'Batch created');
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const batch = await Batch.findOne({ _id: req.params.id, centerId: req.centerId })
      .populate('teachers', 'name email')
      .populate('students', 'name email');
    if (!batch) return notFound(res, 'Batch not found');
    return success(res, { batch });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authorize('centeradmin', 'teacher'), async (req, res, next) => {
  try {
    const batch = await Batch.findOneAndUpdate(
      { _id: req.params.id, centerId: req.centerId },
      req.body,
      { new: true }
    );
    if (!batch) return notFound(res, 'Batch not found');
    return success(res, { batch }, 'Batch updated');
  } catch (err) {
    next(err);
  }
});

router.post('/:id/add-students', authorize('centeradmin', 'teacher'), async (req, res, next) => {
  try {
    const { studentIds } = req.body;
    const batch = await Batch.findOne({ _id: req.params.id, centerId: req.centerId });
    if (!batch) return notFound(res, 'Batch not found');

    const students = await User.find({
      _id: { $in: studentIds },
      centerId: req.centerId,
      role: 'student',
    });
    const ids = students.map((s) => s._id);
    batch.students = [...new Set([...batch.students.map(String), ...ids.map(String)])].map(
      (id) => id
    );
    await batch.save();

    await User.updateMany({ _id: { $in: ids } }, { $addToSet: { batches: batch._id } });
    return success(res, { batch }, 'Students added');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
