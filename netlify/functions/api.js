// Netlify Serverless Function serving the REST JSON API for ICST Integration
// Exposes endpoints:
// - /api/results
// - /api/student
// - /api/school
// - /api/scholarship

exports.handler = async (event, context) => {
  const path = event.path.replace(/\/\.netlify\/functions\/api/, '') || event.path;
  const params = event.queryStringParameters || {};
  
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Fallback mock data structures (simulating database select query results)
  const MOCK_SCHOOLS = [
    { school_id: 'SCH-0001', name: 'Kolkata Science Academy', udise: '19170100101', district: 'Kolkata', block: 'Ward 82' },
    { school_id: 'SCH-0002', name: 'Midnapore Town High School', udise: '19200200502', district: 'Paschim Medinipur', block: 'Midnapore Sadar' }
  ];

  const MOCK_SCHOLARSHIPS = [
    { id: 'sch-1', name: 'ICST Scholarship 2026', academic_year: 2026, status: 'ResultsPublished' }
  ];

  const MOCK_RESULTS = [
    {
      roll_number: '26100001',
      student_id: 'STU-000001',
      name: 'Arijit Roy',
      school: 'Kolkata Science Academy',
      subjects: [
        { name: 'Mathematics', full_marks: 100, pass_marks: 35, obtained: 88 },
        { name: 'Physical Science', full_marks: 100, pass_marks: 35, obtained: 92 },
        { name: 'English', full_marks: 50, pass_marks: 18, obtained: 42 }
      ],
      total: 222,
      percentage: '88.80%',
      grade: 'E (Excellent)',
      status: 'QUALIFIED'
    },
    {
      roll_number: '26100002',
      student_id: 'STU-000002',
      name: 'Riya Sen',
      school: 'Kolkata Science Academy',
      subjects: [
        { name: 'Mathematics', full_marks: 100, pass_marks: 35, obtained: 74 },
        { name: 'Physical Science', full_marks: 100, pass_marks: 35, obtained: 85 },
        { name: 'English', full_marks: 50, pass_marks: 18, obtained: 38 }
      ],
      total: 197,
      percentage: '78.80%',
      grade: 'A+ (Very Good)',
      status: 'QUALIFIED'
    }
  ];

  try {
    // 1. Endpoint: /api/scholarship
    if (path.includes('/scholarship')) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(MOCK_SCHOLARSHIPS)
      };
    }

    // 2. Endpoint: /api/school
    if (path.includes('/school')) {
      let filtered = [...MOCK_SCHOOLS];
      if (params.district) {
        filtered = filtered.filter(s => s.district.toLowerCase() === params.district.toLowerCase());
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(filtered)
      };
    }

    // 3. Endpoint: /api/results
    if (path.includes('/results')) {
      let filtered = [...MOCK_RESULTS];
      if (params.roll) {
        filtered = filtered.filter(r => r.roll_number === params.roll);
      }
      if (params.school) {
        filtered = filtered.filter(r => r.school.toLowerCase().includes(params.school.toLowerCase()));
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(filtered)
      };
    }

    // 4. Default API home
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "ICST Scholarship API service running",
        endpoints: ["/api/results", "/api/student", "/api/school", "/api/scholarship"],
        parameters: ["roll", "school", "district"]
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
