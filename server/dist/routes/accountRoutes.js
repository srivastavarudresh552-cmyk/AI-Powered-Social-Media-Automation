import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { addAccount, disconnectAccount, getAccounts } from '../controllers/accountControllers.js';
const accountRouter = express.Router();
// Get list of connected accounts
accountRouter.get('/', protect, getAccounts);
// Add a new account
accountRouter.post('/', protect, addAccount);
// Disconnect/delete a specific account by ID
accountRouter.delete('/:id', protect, disconnectAccount);
export default accountRouter;
