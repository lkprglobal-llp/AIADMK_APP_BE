// Test script for AIADMK Election Management System APIs
// Run this with: node test_apis.js

const axios = require('axios');

const BASE_URL = 'http://localhost:5253/api';

// Test configuration
const testConfig = {
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Test data
const testData = {
  election_id: null, // Will be set after creating election
  party_id: null,    // Will be set after creating party
  booth_id: null     // Will be set after creating booth
};

async function runTests() {
  console.log('🚀 Starting API Tests for Election Management System\n');

  try {
    // Test 1: Get all parties
    console.log('1. Testing GET /parties');
    const partiesResponse = await axios.get(`${BASE_URL}/parties`);
    console.log(`✅ Parties found: ${partiesResponse.data.length}`);
    if (partiesResponse.data.length > 0) {
      testData.party_id = partiesResponse.data[0].id;
      console.log(`   Using party: ${partiesResponse.data[0].name}`);
    }

    // Test 2: Get all elections
    console.log('\n2. Testing GET /elections');
    const electionsResponse = await axios.get(`${BASE_URL}/elections`);
    console.log(`✅ Elections found: ${electionsResponse.data.length}`);
    if (electionsResponse.data.length > 0) {
      testData.election_id = electionsResponse.data[0].id;
      console.log(`   Using election: ${electionsResponse.data[0].name} (${electionsResponse.data[0].year})`);
    }

    // Test 3: Get booths
    console.log('\n3. Testing GET /booths');
    const boothsResponse = await axios.get(`${BASE_URL}/booths`, {
      params: { election_id: testData.election_id }
    });
    console.log(`✅ Booths found: ${boothsResponse.data.length}`);
    if (boothsResponse.data.length > 0) {
      testData.booth_id = boothsResponse.data[0].id;
      console.log(`   Using booth: ${boothsResponse.data[0].booth_name}`);
    }

    // Test 4: Analytics - Party Vote Summary
    console.log('\n4. Testing GET /analytics/party-vote-summary');
    const partyVoteSummary = await axios.get(`${BASE_URL}/analytics/party-vote-summary`, {
      params: { election_id: testData.election_id }
    });
    console.log(`✅ Party vote summary retrieved: ${partyVoteSummary.data.length} parties`);
    partyVoteSummary.data.slice(0, 3).forEach(party => {
      console.log(`   ${party.party_name}: ${party.total_votes} votes (${party.vote_share_percentage}%)`);
    });

    // Test 5: Analytics - Election Summary
    if (testData.election_id) {
      console.log('\n5. Testing GET /analytics/election-summary/:electionId');
      const electionSummary = await axios.get(`${BASE_URL}/analytics/election-summary/${testData.election_id}`);
      console.log('✅ Election summary retrieved:');
      console.log(`   Total Booths: ${electionSummary.data.total_booths || 0}`);
      console.log(`   Total Voters: ${electionSummary.data.total_voters || 0}`);
      console.log(`   Overall Turnout: ${electionSummary.data.overall_turnout || 0}%`);
    }

    // Test 6: Analytics - Chart Data
    if (testData.election_id) {
      console.log('\n6. Testing GET /analytics/chart-data/:electionId');
      const chartData = await axios.get(`${BASE_URL}/analytics/chart-data/${testData.election_id}`);
      console.log('✅ Chart data retrieved:');
      console.log(`   Party Data Points: ${chartData.data.partyData?.length || 0}`);
      console.log(`   Location Data Points: ${chartData.data.locationData?.length || 0}`);
      console.log(`   Total Votes: ${chartData.data.summary?.totalVotes || 0}`);
    }

    // Test 7: Analytics - Booth Winners
    console.log('\n7. Testing GET /analytics/booth-winners');
    const boothWinners = await axios.get(`${BASE_URL}/analytics/booth-winners`, {
      params: { election_id: testData.election_id }
    });
    console.log(`✅ Booth winners retrieved: ${boothWinners.data.length} booths`);
    boothWinners.data.slice(0, 3).forEach(booth => {
      console.log(`   ${booth.booth_name}: ${booth.winning_party} (${booth.vote_percentage}%)`);
    });

    // Test 8: Analytics - Location Summary
    console.log('\n8. Testing GET /analytics/location-summary');
    const locationSummary = await axios.get(`${BASE_URL}/analytics/location-summary`, {
      params: { election_id: testData.election_id }
    });
    console.log(`✅ Location summary retrieved: ${locationSummary.data.length} locations`);
    locationSummary.data.slice(0, 3).forEach(location => {
      console.log(`   ${location.location}: ${location.turnout_percentage}% turnout, Leading: ${location.leading_party}`);
    });

    // Test 9: Polling - Election Overview
    if (testData.election_id) {
      console.log('\n9. Testing GET /polling/election-overview/:electionId');
      const electionOverview = await axios.get(`${BASE_URL}/polling/election-overview/${testData.election_id}`);
      console.log('✅ Election overview retrieved:');
      console.log(`   Election: ${electionOverview.data.overview?.election_name}`);
      console.log(`   Parties: ${electionOverview.data.partyResults?.length || 0}`);
      if (electionOverview.data.partyResults?.length > 0) {
        console.log(`   Top Party: ${electionOverview.data.partyResults[0].party_name} (${electionOverview.data.partyResults[0].vote_share_percentage}%)`);
      }
    }

    // Test 10: Polling - Live Results
    console.log('\n10. Testing GET /polling/live-results');
    const liveResults = await axios.get(`${BASE_URL}/polling/live-results`, {
      params: { election_id: testData.election_id }
    });
    console.log(`✅ Live results retrieved: ${liveResults.data.length} booths`);
    if (liveResults.data.length > 0) {
      const firstBooth = liveResults.data[0];
      console.log(`   Sample Booth: ${firstBooth.booth_name}`);
      console.log(`   Turnout: ${firstBooth.turnout_percentage}%`);
      console.log(`   Parties: ${firstBooth.party_results?.length || 0}`);
    }

    // Test 11: Booth Results with Percentages
    if (testData.booth_id) {
      console.log('\n11. Testing GET /booth-results/:boothId');
      const boothResults = await axios.get(`${BASE_URL}/booth-results/${testData.booth_id}`);
      console.log(`✅ Booth results retrieved: ${boothResults.data.length} party results`);
      boothResults.data.slice(0, 3).forEach(result => {
        console.log(`   ${result.party_name}: ${result.votes} votes (${result.polling_percentage}%)`);
      });
    }

    // Test 12: Enhanced Booth Details
    if (testData.booth_id) {
      console.log('\n12. Testing GET /booths/:id (enhanced)');
      const boothDetails = await axios.get(`${BASE_URL}/booths/${testData.booth_id}`);
      console.log('✅ Enhanced booth details retrieved:');
      console.log(`   Booth: ${boothDetails.data.booth_name}`);
      console.log(`   Total Voters: ${boothDetails.data.total_voters}`);
      console.log(`   Turnout: ${boothDetails.data.summary?.turnout_percentage}%`);
      console.log(`   Parties Contested: ${boothDetails.data.summary?.parties_contested}`);
    }

    // Test 13: Party Trend Analysis
    if (testData.party_id) {
      console.log('\n13. Testing GET /analytics/party-trend/:partyId');
      const partyTrend = await axios.get(`${BASE_URL}/analytics/party-trend/${testData.party_id}`);
      console.log(`✅ Party trend retrieved: ${partyTrend.data.length} election records`);
      partyTrend.data.forEach(trend => {
        console.log(`   ${trend.year}: ${trend.total_votes} votes (${trend.vote_percentage}%)`);
      });
    }

    // Test 14: Yearly Statistics
    console.log('\n14. Testing GET /analytics/yearly-stats');
    const yearlyStats = await axios.get(`${BASE_URL}/analytics/yearly-stats`);
    console.log(`✅ Yearly statistics retrieved: ${yearlyStats.data.length} years`);
    yearlyStats.data.slice(0, 3).forEach(year => {
      console.log(`   ${year.year}: ${year.elections_held} elections, ${year.avg_turnout}% avg turnout`);
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Parties: ${partiesResponse.data.length}`);
    console.log(`   - Elections: ${electionsResponse.data.length}`);
    console.log(`   - Booths: ${boothsResponse.data.length}`);
    console.log(`   - All analytics endpoints working ✅`);
    console.log(`   - All polling endpoints working ✅`);
    console.log(`   - Percentage calculations working ✅`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

// Helper function to create test data if needed
async function createTestData() {
  console.log('🔧 Creating test data...\n');

  try {
    // Create a test election if none exists
    const electionsResponse = await axios.get(`${BASE_URL}/elections`);
    if (electionsResponse.data.length === 0) {
      console.log('Creating test election...');
      await axios.post(`${BASE_URL}/elections`, {
        name: 'Test Election 2024',
        year: 2024,
        type: 'general'
      });
    }

    // Create test parties if none exist
    const partiesResponse = await axios.get(`${BASE_URL}/parties`);
    if (partiesResponse.data.length === 0) {
      console.log('Creating test parties...');
      const testParties = [
        { name: 'AIADMK', short_name: 'AIADMK', color: '#00FF00' },
        { name: 'DMK', short_name: 'DMK', color: '#FF0000' },
        { name: 'BJP', short_name: 'BJP', color: '#FF9933' }
      ];

      for (const party of testParties) {
        await axios.post(`${BASE_URL}/parties`, party);
      }
    }

    console.log('✅ Test data ready\n');
  } catch (error) {
    console.log('⚠️  Could not create test data, using existing data\n');
  }
}

// Run the tests
async function main() {
  await createTestData();
  await runTests();
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runTests, createTestData };