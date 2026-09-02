const fs = require('fs');
const path = require('path');

const headers = [
  'Employee Code',
  'Full Name',
  'Email Address',
  'Password',
  'Role (Admin/CEO/COO/Team Lead/Employee)',
  'Designation (Sales Executive/Designer/Manager/etc)',
  'Department (Sales/Design/HR/Operations)',
  'Basic Salary (PKR)',
  'Sales Commission (%)',
  'Phone Number',
  'Bank Account / IBAN',
  'Shift Start (e.g. 09:30)',
  'Shift End (e.g. 18:30)',
  'Joining Date (YYYY-MM-DD)'
];

const sampleRows = [
  [
    'EMP-001',
    'Subu Ahad',
    'subuahad1@gmail.com',
    'xenith@12',
    'CEO',
    'CEO & Founder',
    'Executive',
    '0',
    '0',
    '03001234567',
    'PK00MEZN0000000000000000',
    '09:30',
    '18:30',
    '2024-01-01'
  ],
  [
    'EMP-002',
    'Zain Ahmed',
    'zain@artxenith.com',
    'xenith@12',
    'Employee',
    'Sales Executive',
    'Sales',
    '120000',
    '5',
    '03019876543',
    'PK11HABB0000000000000000',
    '09:30',
    '18:30',
    '2024-02-15'
  ],
  [
    'EMP-003',
    'Sara Khan',
    'sara@artxenith.com',
    'xenith@12',
    'Employee',
    'Senior Graphic Designer',
    'Design',
    '150000',
    '0',
    '03215554321',
    'PK22BAHL0000000000000000',
    '09:30',
    '18:30',
    '2024-03-01'
  ],
  [
    'EMP-004',
    'Usman Ali',
    'usman@artxenith.com',
    'xenith@12',
    'Team Lead',
    'Sales Team Lead',
    'Sales',
    '180000',
    '3',
    '03337778899',
    'PK33MCBB0000000000000000',
    '09:30',
    '18:30',
    '2023-11-10'
  ]
];

const csvContent = [
  headers.join(','),
  ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
].join('\n');

const csvPath = path.join('C:', 'Users', 'nasir', 'Desktop', 'artxenith', 'employee_import_template.csv');
fs.writeFileSync(csvPath, csvContent, 'utf8');

console.log('✅ CSV Template created successfully at:', csvPath);
