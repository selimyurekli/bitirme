const supertest = require('supertest');
const { app } = require('./app'); // Ensure app is correctly exported from your app file
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const fs = require('fs');

const User = require('./models/user'); // Adjust path accordingly
const Institution = require('./models/institution'); // Adjust path accordingly
const Proposal = require('./models/proposal'); // Adjust path accordingly
const Project = require('./models/project'); // Adjust path accordingly
const Tag = require('./models/tag'); // Adjust path accordingly
const Dataset = require('./models/dataset'); // Adjust path accordingly
const dfd = require("danfojs-node");

const tokenManager = require('./utils/TokenManager'); // Adjust path accordingly
const emailSender = require('./utils/EmailSender'); // Adjust path accordingly
jest.mock('./models/user'); // Mock User model
jest.mock('./models/institution'); // Mock institution model
jest.mock('./models/tag'); // Mock tag model
jest.mock('./models/project'); // Mock project model
jest.mock('./models/proposal'); // Mock proposal model
jest.mock('./models/dataset'); // Mock dataset model
jest.mock('./anonymize'); // Mock anonymize


jest.mock('bcrypt'); // Mock bcrypt

const { login, signup, verifyUser, userDetail, getUserNameFromId, editUserProfile, forgotPassword, resetPassword} = require('./controller/user'); // Adjust path accordingly
const { addInstitution, getInstutitions} = require('./controller/institution'); // Adjust path accordingly
const { addTag, getTags } = require('./controller/tag'); // Adjust path accordingly
const { createProposal, updateProposal, evaluateProposal, listProposals } = require('./controller/proposal'); // Adjust path accordingly
const { createProject, createDatasetAndAdd2Project, previewDataset} = require('./controller/project'); // Adjust path accordingly
const {anonymizeFile} = require('./anonymize')
const EmailSender = require('./utils/EmailSender');
const TokenManager = require('./utils/TokenManager');
const { application } = require('express');


const request = supertest(app);

const mockRequest = (body) => {
    return {
        body
    };
};
const mockRequestWithHeader= (body, token) => {
    return {
        body,
        headers: {
            authorization: token || ''
        }
    };
};

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    return res;
};

const mockNext = jest.fn();

describe('API user', () => {
    beforeAll(async () => {
        await mongoose.connect('mongodb+srv://selimyurekligs:Selim12345@cluster0.bvqodo0.mongodb.net/Bitirme', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });
    describe('POST /api/user/login', () => {
        it('should return 200 and token if login is successful', async () => {
            const mockUser = { _id: 'userId123', email: 'test@example.com', password: 'hashedpassword', verified: true, blocked: false };
            User.findOne.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);

            const req = mockRequest({ email: 'test@example.com', password: 'password123' });
            const res = mockResponse();

            await login(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });


    describe('POST /api/user/signup', () => {
        beforeEach(() => {
            Institution.findById = jest.fn(); // Mock the findById method
            User.findOne = jest.fn();
            EmailSender.prototype.sendEmail = jest.fn().mockResolvedValue(true); // Mock sendEmail to always return true

        });

        it('should return 201 if user is created successfully', async () => {
            const mockInstitution = { _id: 'validInstitutionId' };
            Institution.findById.mockResolvedValue(mockInstitution);
            User.findOne.mockResolvedValue(null);

            const req = mockRequest({ email: 'test@example.com', password: 'password123', name: 'John', surname: 'Doe', address: '123 Main St', institutionId: 'validInstitutionId', role: 'user' });
            const res = mockResponse();

            await signup(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ message: 'User created successfully' });
        });
    });

    describe('POST /api/user/verify', () => {
        beforeEach(() => {
            User.findOne = jest.fn();
        });

        it('should return 200 if user is verified successfully', async () => {
            const mockUser = { email: 'test@example.com', verificationCode: '123456', save: jest.fn() };
            User.findOne.mockResolvedValue(mockUser);

            const req = mockRequest({ email: 'test@example.com', verificationCode: '123456' });
            const res = mockResponse();

            await verifyUser(req, res, mockNext);

            expect(mockUser.verified).toBe(true);
            expect(mockUser.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'User verified successfully' });
        });
    });

    describe('GET /api/user/detail', () => {
        beforeEach(() => {
            User.findById = jest.fn();
        });

        it('should return user details if user is found', async () => {
            const mockUser = { _id: 'validUserId', name: 'John', email: 'test@example.com' };
            User.findById.mockResolvedValue(mockUser);

            const req = { authenticatedUserId: 'validUserId' }; // Mocking authenticatedUserId
            const res = mockResponse();

            await userDetail(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ user: mockUser });
        });
    });

    describe('GET /api/user/name', () => {
        beforeEach(() => {
            User.findById = jest.fn();
        });

        it('should return user name information from id', async () => {
            const userId = 'validUserId';
            const mockUser = { _id: userId, name: 'John', surname: 'Doe', email: 'john@example.com' };

            User.findById.mockResolvedValue(mockUser);

            const expectedUserNameInfo = { _id: userId, name: 'John', surname: 'Doe', email: 'john@example.com' };

            const req = { query: { userId } };
            const res = mockResponse();

            await getUserNameFromId(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ userNameInfo: expectedUserNameInfo });
        });
    });

    describe('POST /api/user/forgotPassword', () => {

        beforeEach(() => {
            User.findOne = jest.fn();
            EmailSender.prototype.sendEmail = jest.fn().mockResolvedValue(true); // Mock sendEmail to always return true
        });

        it('should send reset code to user email', async () => {
            const email = 'test@example.com';
            const mockUser = { email: email, save: jest.fn() };

            User.findOne.mockResolvedValue(mockUser);

            const req = { body: { email } };
            const res = mockResponse();

            await forgotPassword(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Sent code to your email address.' });
        });
    });

    describe('POST /api/user/resetPassword', () => {
        beforeEach(() => {
            User.findOne = jest.fn();
        });

        it('should reset user password with correct reset code', async () => {
            const email = 'test@example.com';
            const newPassword = 'newPassword';
            const resetCode = '123456';

            const mockUser = { email, verificationCode: resetCode, save: jest.fn() };

            User.findOne.mockResolvedValue(mockUser);

            const req = { body: { email, newPassword, resetCode } };
            const res = mockResponse();

            await resetPassword(req, res, mockNext);

            expect(User.findOne).toHaveBeenCalledWith({ email });
            expect(mockUser.password).toEqual(newPassword);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Password successfully changed.' });
        });
    });

    describe('editUserProfile function', () => {
        it('should update user profile successfully', async () => {

            const req = mockRequest({
                authenticatedUserId: 'user_id_here', // Mock authenticated user id
                body: {
                    name: 'Updated Name',
                    surname: 'Updated Surname',
                    role: 'Updated Role',
                    institutionId: 'Updated Institution ID',
                    address: 'Updated Address'
                }
            });
            const res = mockResponse();

            // Mock User.findById to resolve with the mock user
            const mockUser = {
                _id: req.authenticatedUserId,
                name: 'Original Name',
                surname: 'Original Surname',
                role: 'Original Role',
                institutionId: 'Original Institution ID',
                address: 'Original Address',
                save: jest.fn() // Mock save method
            };
            User.findById = jest.fn().mockResolvedValue(mockUser);


            const updatedUserProfile = {
                _id: req.authenticatedUserId,
                name: req.body.name,
                surname: req.body.surname,
                role: req.body.role,
                institutionId: req.body.institutionId,
                address: req.body.address
            };
            User.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedUserProfile);

            await editUserProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});

describe('API Institution', () => {
    beforeAll(async () => {
        await mongoose.connect('mongodb+srv://selimyurekligs:Selim12345@cluster0.bvqodo0.mongodb.net/Bitirme', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('addInstitution', () => {
        it('should add an institution successfully', async () => {

            const institutionData = { name: 'Test Institution', location: 'Test Location', save: jest.fn()};
            const req = { body: institutionData };
            const res = mockResponse();
            
            await addInstitution(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getInstitutions', () => {
        beforeEach(() => {
            Institution.find = jest.fn();
        });
        it('should get all institutions successfully', async () => {
            const institutions = [
                { _id: '1', name: 'Institution 1', location: 'Location 1' },
                { _id: '2', name: 'Institution 2', location: 'Location 2' }
            ];

            Institution.find.mockResolvedValue(institutions);

            const req = {};
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await getInstutitions(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(institutions);
        });
    });
});

describe('API Tag', () => {
    beforeAll(async () => {
        await mongoose.connect('mongodb+srv://selimyurekligs:Selim12345@cluster0.bvqodo0.mongodb.net/Bitirme', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('addTag', () => {
        it('should add an tag successfully', async () => {
            const tagData = { name: 'Test T123123ag', save: jest.fn() };

            const req = { body: tagData };
            const res = mockResponse();

            await addTag(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getTags', () => {
        beforeEach(() => {
            Tag.find = jest.fn();
        });
        it('should get all institutions successfully', async () => {
            const tags = [
                { _id: '1', name: 'Tag 1'},
                { _id: '2', name: 'Tag 2'}
            ];

            Tag.find.mockResolvedValue(tags);

            const req = {};
            const res = mockResponse();

            await getTags(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});

describe('API proposal', () => {
    beforeAll(async () => {
        await mongoose.connect('mongodb+srv://selimyurekligs:Selim12345@cluster0.bvqodo0.mongodb.net/Bitirme', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('createProposal', () => {
        it('should create a proposal successfully', async () => {
            const userId = 'userId123';
            const projectId = 'projectId123';
            const applicantUserIds = ['email1@example.com', 'email2@example.com'];

            const mockUser = {
                _id: userId,
                proposalIds: [],
                save: jest.fn().mockResolvedValue()
            };

            const mockCollaborators = [
                { _id: 'user1Id' },
                { _id: 'user2Id' }
            ];

            const mockProposal = {
                _id: 'proposalId123',
                projectId: projectId,
                save: jest.fn().mockResolvedValue({
                    _id: 'proposalId123',
                    projectId: projectId
                })
            };

            const mockProject = {
                _id: projectId,
                proposalIds: [],
                save: jest.fn().mockResolvedValue()
            };

            User.findById.mockResolvedValue(mockUser);
            User.find.mockResolvedValue(mockCollaborators);
            Proposal.mockImplementation(() => mockProposal);
            Project.findById.mockResolvedValue(mockProject);

            const req = mockRequest({
                proposalText: 'Proposal text',
                potentialResearchBenefits: 'Research benefits',
                projectId: projectId,
                applicantUserIds: applicantUserIds
            }, userId);

            const res = mockResponse();

            await createProposal(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('updateProposal', () => {
        const proposalCreator = { _id: 'creatorId123' };

        beforeEach(() => {
            User.findOne = jest.fn();
            User.find = jest.fn();
            Proposal.findByIdAndUpdate = jest.fn();
            TokenManager.prototype.verifyToken = jest.fn().mockResolvedValue(proposalCreator); // Mock sendEmail to always return true
        });

        it('should update a proposal successfully', async () => {

            const token = 'Bearer token';

            const applicantUserIds = ['email1@example.com', 'email2@example.com'];

            const mockCollaborators = [
                { _id: 'user1Id' },
                { _id: 'user2Id' }
            ];

            const updatedProposal = {
                _id: 'proposalId123',
                proposalText: 'Updated proposal text',
                potentialResearchBenefits: 'Updated research benefits',
                institutionId: 'updatedInstitutionId',
                projectId: 'updatedProjectId',
                applicatorId: proposalCreator._id,
                applicantUserIds: applicantUserIds,
                updated_at: Date.now()
            };

            User.find.mockResolvedValue(mockCollaborators);
            Proposal.findByIdAndUpdate.mockResolvedValue(updatedProposal);

            const req = mockRequestWithHeader({
                proposalId: 'proposalId123',
                proposalText: 'Updated proposal text',
                potentialResearchBenefits: 'Updated research benefits',
                institutionId: 'updatedInstitutionId',
                projectId: 'updatedProjectId',
                applicantUserIds: applicantUserIds,
            },token);

            const res = mockResponse();

            await updateProposal(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('evaluateProposal', () => {
        it('should evaluate the proposal successfully', async () => {
            const userId = 'ownerId123';
            const proposalId = 'proposalId123';
            const projectId = 'projectId123';
            const applicatorId = 'applicatorId123';
            const applicantUserIds = ['applicant1', 'applicant2'];

            const mockOwner = { _id: userId };
            const mockProposal = {
                _id: proposalId,
                verified: 'none',
                projectId: projectId,
                applicatorId: applicatorId,
                applicantUserIds: applicantUserIds,
                save: jest.fn().mockResolvedValue(true)
            };
            const mockProject = {
                _id: projectId,
                ownerId: userId,
                userIds: [],
                save: jest.fn().mockResolvedValue(true)
            };

            User.findById.mockResolvedValue(mockOwner);
            Proposal.findById.mockResolvedValue(mockProposal);
            Project.findById.mockResolvedValue(mockProject);
            User.updateMany.mockResolvedValue({ nModified: applicantUserIds.length });
            User.updateOne.mockResolvedValue({ nModified: 1 });

            const req = mockRequest({
                proposalId: proposalId,
                verified: 'accept',
                proposalReviewText: 'Looks good'
            });
            req.authanticatedUserId = userId;
            const res = mockResponse();

            await evaluateProposal(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
    // describe('listProposals', () => {
    //     beforeEach(() => {
    //         User.findOne = jest.fn();
    //         User.find = jest.fn();
    //         Proposal.findByIdAndUpdate = jest.fn();
    //         Proposal.find = jest.fn(); // Mock sendEmail to always return true
    //     });
    //     it('should list sent and received proposals successfully', async () => {
    //         const userId = 'userId123';
    //         const proposalIds = ['proposal1', 'proposal2'];
    //         const ownedProjectIds = ['project1', 'project2'];

    //         const mockUser = {
    //             _id: userId,
    //             proposalIds: proposalIds,
    //             ownedProjectIds: ownedProjectIds
    //         };

    //         const mockProposals = proposalIds.map(id => ({
    //             _id: id,
    //             proposalText: `Proposal Text ${id}`,
    //             updated_at: new Date(),
    //             sort: jest.fn(() => mockProposals)

    //         }));

    //         const mockProjects = ownedProjectIds.map(id => ({
    //             _id: id,
    //             name: `Project Name ${id}`,
    //             description: `Project Description ${id}`,
    //             proposalIds: proposalIds,
    //             sort: jest.fn(() => mockProjects)
    //         }));

    //         const mockReceivedProposals = proposalIds.map(id => ({
    //             _id: id,
    //             proposalText: `Proposal Text ${id}`,
    //             verified: 'none',
    //             sort: jest.fn(() => mockReceivedProposals)

    //         }));

    //         User.findById.mockResolvedValue(mockUser);
    //         Proposal.find.mockResolvedValue(mockProposals);
    //         Project.find.mockResolvedValue(mockProjects);

    //         const req = mockRequest();
    //         req.authanticatedUserId = userId;
    //         const res = mockResponse();

    //         await listProposals(req, res, mockNext);


    //         expect(res.status).toHaveBeenCalledWith(200);
    //     });
    // });
});

describe('API project', () => {
    beforeAll(async () => {
        await mongoose.connect('mongodb+srv://selimyurekligs:Selim12345@cluster0.bvqodo0.mongodb.net/Bitirme', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('createProject', () => {
        it('should create a project successfully', async () => {
            const userId = 'userId123';
            const projectData = {
                name: 'New Project',
                description: 'Project Description',
                abstract: 'Project Abstract',
                isPublic: true,
                tags: ['tag1', 'tag2']
            };

            const mockUser = {
                _id: userId,
                ownedProjectIds: [],
                save: jest.fn()
            };

            const mockTags = [
                { _id: 'tag1', name: 'tag1', projectIds: [], save: jest.fn() },
                { _id: 'tag2', name: 'tag2', projectIds: [], save: jest.fn() }
            ];

            const mockProject = {
                _id: 'projectId123',
                save: jest.fn().mockResolvedValue(this)
            };

            User.findById.mockResolvedValue(mockUser);
            Tag.find.mockResolvedValue(mockTags);
            Project.prototype.save = jest.fn().mockResolvedValue(mockProject);

            const req = mockRequest(projectData, userId);
            const res = mockResponse();

            await createProject(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('createDatasetAndAdd2Project', () => {
        it('should create a dataset and add it to the project successfully', async () => {
            const projectId = 'projectId123';
            const datasetId = 'datasetId123';
            const mockProject = {
                _id: projectId,
                datasetIds: [],
                save: jest.fn().mockResolvedValue(this)
            };
            const mockDataset = {
                _id: datasetId,
                save: jest.fn().mockResolvedValue(this)
            };

            Project.findById.mockResolvedValue(mockProject);
            Dataset.prototype.save = jest.fn().mockResolvedValue(mockDataset);
            anonymizeFile.mockResolvedValue();

            const req = mockRequest({
                projectId: projectId,
                name: 'Dataset Name',
                description: 'Dataset Description',
                columnNames: 'col1,col2',
                columnActions: 'mask,remove'
            });
            req.files =  [{ originalname: 'file.txt', buffer: Buffer.from('file content') }];

            const res = mockResponse();

            await createDatasetAndAdd2Project(req, res, mockNext);
            
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });



});