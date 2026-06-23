import express from 'express';
import { getInformations, markInformationRead } from '../controllers/informationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getInformations);
router.post('/:id/read', markInformationRead);

export default router;
