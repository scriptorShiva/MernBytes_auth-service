import express, { NextFunction, Request, Response } from 'express';
import { HttpError } from 'http-errors';
import logger from './config/logger';
import authRouter from './routes/auth';

const app = express();

// Middleware
app.use(express.json()); // Parse JSON request bodies

// Define your routes and application logic here
// Define a route (for test ) : create a seperate route file
app.get('/', (req, res) => {
    res.send('Welcome to auth service');
});

// register route files
app.use('/auth', authRouter);

// Global Error Handler - This should be the last middleware in the chain
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: HttpError, req: Request, res: Response, next: NextFunction) => {
    logger.error(err.message);
    const statusCode = err.statusCode || err.status || 500;
    res.status(statusCode).json({
        errors: [
            {
                type: err.name,
                msg: err.message,
                path: '',
                location: '',
            },
        ],
    });
});

export default app;
