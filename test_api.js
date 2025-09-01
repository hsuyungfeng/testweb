const fs = require('fs');
const path = require('path');

// Test the standardization function directly
const { transformToStandardFormat } = require('./src/transformers/universalTransformer');

async function testStandardization() {
    try {
        console.log('Testing standardization with test_sample.csv...');
        const data = await transformToStandardFormat('test_sample.csv', 'csv');
        console.log('Standardized data length:', data.length);
        console.log('First record:', data[0]);
        console.log('First record keys:', Object.keys(data[0]));
        console.log('Has data:', Object.keys(data[0]).length > 0);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testStandardization();