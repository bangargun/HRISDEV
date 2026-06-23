import express from 'express';
import { login, getMe, getMyPermissions } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Autentikasi Publik
router.post('/login', login);

// Keamanan Private Profil
router.get('/me', authenticateToken, getMe);
router.get('/my-permissions', authenticateToken, getMyPermissions);

export default router;
