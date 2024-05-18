const supertest = require('supertest');
const { app } = require('./app');
const mongoose = require('mongoose');
const { addInstitution, getInstutitions } = require('./controller/institution');

jest.mock('./models/institution');
const Institution = require('./models/institution');

const request = supertest(app);

describe('Institution Controller', () => {
    beforeAll(async () => {
        await mongoose.connect('mongodb+srv://selimyurekligs:Selim12345@cluster0.bvqodo0.mongodb.net/Bitirme', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    afterAll(async () => {
        app.close();
        await mongoose.connection.close();
    });

    describe('addInstitution', () => {
        it('should add an institution successfully', async () => {
            const institutionData = { name: 'Test Institution', location: 'Test Location' };

            Institution.prototype.save.mockResolvedValueOnce({ _id: 'institution_id_here', ...institutionData });

            const req = { body: institutionData };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await addInstitution(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getInstitutions', () => {
        it('should get all institutions successfully', async () => {
            const institutions = [
                { _id: '1', name: 'Institution 1', location: 'Location 1' },
                { _id: '2', name: 'Institution 2', location: 'Location 2' }
            ];

            Institution.find.mockResolvedValueOnce(institutions);

            const req = {};
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await getInstutitions(req, res, null);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(institutions);
        });
    });
});
