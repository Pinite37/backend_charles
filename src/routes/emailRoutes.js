import express from 'express';
import { upload, sendInvitations } from '../controller/emailController.js';

const router = express.Router();

router.post('/send-invitations', upload.single('file'), sendInvitations);

export default router;