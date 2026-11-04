import { Router} from "express";
import { loginUser, registerUser } from "../controllers/authController.js";
import { completeUserOAuth, startUserOAuth } from "../controllers/userOAuthController.js";
const authRouter = Router();

authRouter.post('/register', registerUser)
authRouter.post('/login', loginUser)
authRouter.get('/oauth/:provider', startUserOAuth)
authRouter.get('/oauth/:provider/callback', completeUserOAuth)

export default authRouter;