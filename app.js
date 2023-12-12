// app.js
const mongoose = require('mongoose');

// Connect to MongoDB
require('./db');

const User = require('./models/user');
const Project = require('./models/project');
const Proposal = require('./models/proposal');
const Dataset = require('./models/dataset');
const Tag = require('./models/tag');
const Institution = require('./models/institution');


// Sample Institution
const institutionData = {
  name: 'Sample Institution',
  address: '123 University St',
};

// Sample User
const userData = {
  email: 'user@example.com',
  phone: '123-456-7890',
  name: 'John',
  surname: 'Doe',
  role: 'user',
  blocked: false,
  verified: true,
  verificationCode: 123456,
  address: '456 Main St',
};

// Sample Project
const projectData = {
  name: 'Sample Project',
  description: 'Project description',
  abstract: 'Project abstract',
  isPublic: true,
};

// Sample Proposal
const proposalData = {
  proposalText: 'Proposal text',
  potentialResearchBenefits: 'Research benefits',
};

// Sample Dataset
const datasetData = {
  name: 'Sample Dataset',
  extension: 'csv',
  url: 'https://example.com/dataset',
  contentHTML: '<html>...</html>',
  fields: ['field1', 'field2'],
  fieldDescriptions: ['Description 1', 'Description 2'],
};

// Sample Tag
const tagData = {
  name: 'Sample Tag',
};

// Add sample data to MongoDB
async function addSampleData() {
  try {
    // Create sample institution
    const institution = await Institution.create(institutionData);

    // Create sample user with reference to institution
    const user = await User.create({ ...userData, institutionId: institution._id });

    // Create sample project with reference to user
    const project = await Project.create({ ...projectData, userIds: [user._id] });

    // Create sample proposal with references
    const proposal = await Proposal.create({
      ...proposalData,
      institutionId: institution._id,
      projectId: project._id,
      applicatorId: user._id,
      applicantUserIds: [user._id],
    });

    // Create sample dataset with reference to project
    const dataset = await Dataset.create({ ...datasetData, projectId: project._id });

    // Create sample tag with reference to project
    const tag = await Tag.create({ ...tagData, projectIds: [project._id] });

    console.log('Sample data added successfully.');
  } catch (error) {
    console.error('Error adding sample data:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
  }
}

// Call the function to add sample data
addSampleData();

