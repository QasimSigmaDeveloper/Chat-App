import express from 'express'
import protectRoute from '../middleware/auth.middleware.js';
import msgController from '../controllers/message.controller.js';
const router =express.Router();

router.get('/:id',protectRoute,msgController.getMessage)

router.post('/send/:id',protectRoute,msgController.sendMessage)

export default router;