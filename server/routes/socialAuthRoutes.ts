import  express  from "express";
import { generateAuthURL, syncAccounts } from "../controllers/socialAuthController.js";
import { protect } from "../middleware/authMiddleware.js";

const socialAuthRouter = express.Router();

socialAuthRouter.get('/:platform/url', protect, generateAuthURL)
socialAuthRouter.get('/sync', protect, syncAccounts)

export default socialAuthRouter;
