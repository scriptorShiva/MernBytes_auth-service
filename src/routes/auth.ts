import express, { NextFunction, Request, Response } from 'express';
import { AuthController } from '../controllers/AuthController';
import { UserService } from '../services/UserService';
import { AppDataSource } from '../config/data-source';
import { User } from '../entity/User';
import logger from '../config/logger';
import registerValidator from '../validators/register-validator';

const router = express.Router();

const userRepository = AppDataSource.getRepository(User);
const userService = new UserService(userRepository);
const authController = new AuthController(userService, logger); // this passing of userService is our dependency injection : receive dependencies from constructor function

// router.post('/register', authController.register);
// used this way when any binding issue occurs
router.post(
    '/register',
    registerValidator,
    (req: Request, res: Response, next: NextFunction) =>
        authController.register(req, res, next),
);

export default router;
