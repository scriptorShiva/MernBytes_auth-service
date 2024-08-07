import request from 'supertest';
import app from '../../src/app';
import { User } from '../../src/entity/User';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../../src/config/data-source';
import { Roles } from '../../src/constants';
import { isJwt } from '../utils';
import { RefreshToken } from '../../src/entity/RefreshToken';

describe('POST /auth/register', () => {
    let connection: DataSource;

    // hooks provided by jest
    beforeAll(async () => {
        // runs before test
        connection = await AppDataSource.initialize();
    });

    // before every test we have to clean the database
    beforeEach(async () => {
        // Database truncate
        await connection.dropDatabase();
        await connection.synchronize();
    });

    // for close db connection
    afterAll(async () => {
        await connection.destroy();
    });

    // happy path
    describe('Given all fields', () => {
        it('should return the 201 status code', async () => {
            // for any test we have one formula called AAA : Arrange(prepare input data, connection) , Act(trigger endpoint) , Asert (check the expected resutl)
            //Arrange
            const userData = {
                firstName: 'Shiva',
                lastName: 'Pal',
                email: 'shivapal108941@gmail.com',
                password: 'secret@1234',
            };
            //Act : call endpoint using supertest library
            const response = await request(app)
                .post('/auth/register')
                .send(userData);
            // asert
            expect(response.statusCode).toBe(201);
        });
        it('should return valid json object', async () => {
            //Arrange
            const userData = {
                firstName: 'Shiva',
                lastName: 'Pal',
                email: 'shivapal108941@gmail.com',
                password: 'secret@1234',
            };
            //Act : call endpoint using supertest library
            const response = await request(app)
                .post('/auth/register')
                .send(userData);
            // asert
            expect(
                (response.headers as Record<string, string>)['content-type'],
            ).toEqual(expect.stringContaining('json'));
        });
        it('should persist the user in database', async () => {
            //Arrange
            const userData = {
                firstName: 'Shiva',
                lastName: 'Pal',
                email: 'shivapal108941@gmail.com',
                password: 'secret@1234',
            };
            //Act : call endpoint using supertest library
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const response = await request(app)
                .post('/auth/register')
                .send(userData);
            // Assert
            const userRepository = connection.getRepository(User);
            // get all records in Users table
            const users = await userRepository.find();
            expect(users).toHaveLength(1);
            expect(users[0].firstName).toBe(userData.firstName);
            expect(users[0].lastName).toBe(userData.lastName);
            expect(users[0].email).toBe(userData.email);
        });
        it('should return an id of the created user', async () => {
            // Arrange
            const userData = {
                firstName: 'Shiva',
                lastName: 'Pal',
                email: 'shivapal108941@gmail.com',
                password: 'secret@1234',
            };

            // Act: Call the endpoint using supertest library
            await request(app).post('/auth/register').send(userData);

            // Assert
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            expect(users).toHaveLength(1);
        });
        it('should assign a customer role', async () => {
            // Arrange
            const userData = {
                firstName: 'Shiva',
                lastName: 'Pal',
                email: 'shivapal108941@gmail.com',
                password: 'secret@1234',
            };

            // Act: Call the endpoint using supertest library
            await request(app).post('/auth/register').send(userData);

            // Assert
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            expect(users[0]).toHaveProperty('role');
            expect(users[0].role).toBe(Roles.CUSTOMER);
        });
        it('should store hashed password in the database', async () => {
            // Arrange
            const userData = {
                firstName: 'Shiva',
                lastName: 'Pal',
                email: 'shivapal108941@gmail.com',
                password: 'secret@1234',
            };

            // Act: Call the endpoint using supertest library
            await request(app).post('/auth/register').send(userData);

            // Assert
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            expect(users[0].password).not.toBe(userData.password);
            expect(users[0].password).toHaveLength(60);
            expect(users[0].password).toMatch(/^\$2[b|a]\$\d+\$/);
        });
        it('should return 400 status if email already exist', async () => {
            // Arrange
            const userData = {
                firstName: 'Shiva',
                lastName: 'Pal',
                email: 'shivapal108941@gmail.com',
                password: 'secret@1234',
            };
            const userRepository = connection.getRepository(User);
            await userRepository.save({ ...userData, role: Roles.CUSTOMER });

            // Act: Call the endpoint using supertest library
            const res = await request(app)
                .post('/auth/register')
                .send(userData);
            const users = await userRepository.find();
            // Assert
            expect(res.statusCode).toBe(400);
            expect(users).toHaveLength(1);
            expect;
        });
        it('should return the access token and refresh token inside a cookie', async () => {
            // Arrange
            const userData = {
                firstName: 'Shiva',
                lastName: 'Pal',
                email: 'shivapal108941@gmail.com',
                password: 'secret@1234',
            };

            // Act: Call the endpoint using supertest library
            const res = await request(app)
                .post('/auth/register')
                .send(userData);

            // Assert
            interface Headers {
                ['set-cookie']: string[];
            }
            let accessToken: string | null = null;
            let refreshToken: string | null = null;
            const cookies = (res.headers as Headers)['set-cookie'] || [];
            cookies.forEach((cookie) => {
                if (cookie.startsWith('accessToken=')) {
                    accessToken = cookie.split(';')[0].split('=')[1];
                }
                if (cookie.startsWith('refreshToken=')) {
                    refreshToken = cookie.split(';')[0].split('=')[1];
                }
            });
            expect(accessToken).not.toBe(null);
            expect(refreshToken).not.toBe(null);
            expect(isJwt(accessToken)).toBeTruthy();
            expect(isJwt(refreshToken)).toBeTruthy();
        });
        it('should store the refresh token in the database', async () => {
            // Arrange
            const userData = {
                firstName: 'Shiva',
                lastName: 'Pal',
                email: 'shivapal108941@gmail.com',
                password: 'secret@1234',
            };

            // Act: Call the endpoint using supertest library
            const res = await request(app)
                .post('/auth/register')
                .send(userData);

            // Assert
            const refreshTokenRepo = connection.getRepository(RefreshToken);
            // const refreshToken = await refreshTokenRepo.find();
            const tokens = await refreshTokenRepo
                .createQueryBuilder('refreshToken')
                .where('refreshToken.userId = :userId', {
                    userId: (res.body as Record<string, string>).id,
                })
                .getMany();

            expect(tokens).toHaveLength(1);
        });
    });
    // sad path
    describe('Fields are missing', () => {
        it('should return 400 status code if email field is missing.', async () => {
            // Arrange
            const userData = {
                firstName: 'Shiva',
                lastName: 'Pal',
                email: '',
                password: 'secret@1234',
            };
            // Act: Call the endpoint using supertest library
            const res = await request(app)
                .post('/auth/register')
                .send(userData);
            // Assert
            expect(res.statusCode).toBe(400);
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            expect(users).toHaveLength(0);
        });
        it('should return 400 status code if firstName is missing', async () => {
            // Arrange
            const userData = {
                firstName: '',
                lastName: 'Pal',
                email: 'shivapal108941@gmail.com',
                password: 'secret@1234',
            };
            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            // Assert
            expect(response.statusCode).toBe(400);
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            expect(users).toHaveLength(0);
        });
        it('should return 400 status code if lastName is missing', async () => {
            // Arrange
            const userData = {
                firstName: '',
                lastName: 'Pal',
                email: 'shivapal108941@gmail.com',
                password: 'secret@1234',
            };
            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            // Assert
            expect(response.statusCode).toBe(400);
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            expect(users).toHaveLength(0);
        });
        it('should return 400 status code if password is missing', async () => {
            // Arrange
            const userData = {
                firstName: 'Shiva',
                lastName: 'Pal',
                email: 'shivapal108941@gmail.com',
                password: '',
            };
            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            // Assert
            expect(response.statusCode).toBe(400);
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            expect(users).toHaveLength(0);
        });
    });
    // fields not in proper format
    describe('Fields are not in proper format', () => {
        it('should trim the email field', async () => {
            // Arrange
            const userData = {
                firstName: 'Shiva',
                lastName: 'Pal',
                email: ' shivapal108941@gmail.com ',
                password: 'secret@1234',
            };
            // Act
            await request(app).post('/auth/register').send(userData);

            // Assert
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            const user = users[0];
            expect(user.email).toBe('shivapal108941@gmail.com');
        });
        it('should return 400 status code if email is not a valid email', async () => {
            // Arrange
            const userData = {
                firstName: 'Shiva',
                lastName: 'Pal',
                email: 'shivapal__gmail>com',
                password: 'secret@1234',
            };
            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            // Assert
            expect(response.statusCode).toBe(400);
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            expect(users).toHaveLength(0);
        });
        it('should return 400 status code if password length is less than 8 chars', async () => {
            // Arrange
            const userData = {
                firstName: 'Shiva',
                lastName: 'Pal',
                email: 'shivapal108941@gmail.com',
                password: 'secre',
            };
            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            // Assert
            expect(response.statusCode).toBe(400);
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            expect(users).toHaveLength(0);
        });
        it('shoud return an array of error messages if email is missing', async () => {
            // Arrange
            const userData = {
                firstName: 'Shiva',
                lastName: 'Pal',
                email: '',
                password: 'secret@1234',
            };
            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            // Assert
            expect(response.body).toHaveProperty('errors');
            expect(
                (response.body as Record<string, string>).errors.length,
            ).toBeGreaterThan(0);
        });
    });
});
