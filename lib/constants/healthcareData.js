/**
 * Healthcare Data Constants
 * Pre-populated options for nursing resume builder
 *
 * Design principle: "Tap, don't type" - give nurses options to select
 */

// ============================================
// CERTIFICATIONS
// ============================================

export const CERTIFICATIONS = {
  // Required by most employers
  required: [
    {
      id: 'bls',
      name: 'BLS',
      fullName: 'Basic Life Support',
      issuingBodies: ['American Heart Association', 'American Red Cross'],
      requiredBy: '98% of employers',
      validityYears: 2
    },
    {
      id: 'acls',
      name: 'ACLS',
      fullName: 'Advanced Cardiovascular Life Support',
      issuingBodies: ['American Heart Association'],
      requiredBy: 'Most acute care settings',
      validityYears: 2
    },
    {
      id: 'pals',
      name: 'PALS',
      fullName: 'Pediatric Advanced Life Support',
      issuingBodies: ['American Heart Association'],
      requiredBy: 'Pediatric & Emergency units',
      validityYears: 2
    },
    {
      id: 'nrp',
      name: 'NRP',
      fullName: 'Neonatal Resuscitation Program',
      issuingBodies: ['American Academy of Pediatrics'],
      requiredBy: 'L&D, NICU, Nursery',
      validityYears: 2
    },
    {
      id: 'nihss',
      name: 'NIHSS',
      fullName: 'NIH Stroke Scale',
      issuingBodies: ['American Heart Association'],
      requiredBy: 'Stroke centers, Neuro units',
      validityYears: 1
    }
  ],

  // Specialty certifications
  specialty: [
    // Critical Care
    {
      id: 'ccrn',
      name: 'CCRN',
      fullName: 'Critical Care Registered Nurse',
      issuingBodies: ['AACN'],
      specialties: ['icu', 'critical-care', 'ccu', 'sicu', 'micu'],
      validityYears: 3
    },
    // Emergency
    {
      id: 'cen',
      name: 'CEN',
      fullName: 'Certified Emergency Nurse',
      issuingBodies: ['BCEN'],
      specialties: ['er', 'emergency', 'trauma'],
      validityYears: 4
    },
    {
      id: 'tcrn',
      name: 'TCRN',
      fullName: 'Trauma Certified Registered Nurse',
      issuingBodies: ['BCEN'],
      specialties: ['trauma', 'er', 'emergency'],
      validityYears: 4
    },
    {
      id: 'cpen',
      name: 'CPEN',
      fullName: 'Certified Pediatric Emergency Nurse',
      issuingBodies: ['BCEN'],
      specialties: ['peds-er', 'emergency', 'pediatrics'],
      validityYears: 4
    },
    {
      id: 'tncc',
      name: 'TNCC',
      fullName: 'Trauma Nursing Core Course',
      issuingBodies: ['ENA'],
      specialties: ['er', 'emergency', 'trauma'],
      validityYears: 4
    },
    {
      id: 'enpc',
      name: 'ENPC',
      fullName: 'Emergency Nursing Pediatric Course',
      issuingBodies: ['ENA'],
      specialties: ['er', 'emergency', 'pediatrics', 'peds-er'],
      validityYears: 4
    },

    // Operating Room / Perioperative
    {
      id: 'cnor',
      name: 'CNOR',
      fullName: 'Certified Perioperative Nurse',
      issuingBodies: ['CCI'],
      specialties: ['or', 'surgery', 'perioperative'],
      validityYears: 5
    },

    // OB/Women's Health
    {
      id: 'rnc-ob',
      name: 'RNC-OB',
      fullName: 'Inpatient Obstetric Nursing',
      issuingBodies: ['NCC'],
      specialties: ['labor-delivery', 'ob', 'postpartum'],
      validityYears: 3
    },
    {
      id: 'rnc-nic',
      name: 'RNC-NIC',
      fullName: 'Neonatal Intensive Care Nursing',
      issuingBodies: ['NCC'],
      specialties: ['nicu', 'neonatal'],
      validityYears: 3
    },
    {
      id: 'rnc-mnn',
      name: 'RNC-MNN',
      fullName: 'Maternal Newborn Nursing',
      issuingBodies: ['NCC'],
      specialties: ['postpartum', 'mother-baby', 'nursery'],
      validityYears: 3
    },
    {
      id: 'stable',
      name: 'S.T.A.B.L.E.',
      fullName: 'Sugar, Temperature, Airway, Blood pressure, Lab work, Emotional support',
      issuingBodies: ['S.T.A.B.L.E. Program'],
      specialties: ['nicu', 'neonatal', 'labor-delivery', 'nursery'],
      validityYears: 2
    },

    // Medical-Surgical
    {
      id: 'cmsrn',
      name: 'CMSRN',
      fullName: 'Certified Medical-Surgical Registered Nurse',
      issuingBodies: ['AMSN'],
      specialties: ['med-surg', 'medical-surgical', 'general'],
      validityYears: 5
    },

    // Oncology
    {
      id: 'ocn',
      name: 'OCN',
      fullName: 'Oncology Certified Nurse',
      issuingBodies: ['ONCC'],
      specialties: ['oncology', 'cancer', 'infusion'],
      validityYears: 4
    },

    // Cardiac
    {
      id: 'cvrn',
      name: 'CVRN',
      fullName: 'Cardiac Vascular Nursing',
      issuingBodies: ['ABCNN'],
      specialties: ['cardiac', 'cath-lab', 'cardiovascular'],
      validityYears: 3
    },

    // Progressive Care
    {
      id: 'pccn',
      name: 'PCCN',
      fullName: 'Progressive Care Certified Nurse',
      issuingBodies: ['AACN'],
      specialties: ['stepdown', 'pcu', 'progressive-care', 'telemetry'],
      validityYears: 3
    },

    // Hospice/Palliative
    {
      id: 'chpn',
      name: 'CHPN',
      fullName: 'Certified Hospice and Palliative Nurse',
      issuingBodies: ['HPCC'],
      specialties: ['hospice', 'palliative'],
      validityYears: 4
    },

    // Pediatrics
    {
      id: 'cpn',
      name: 'CPN',
      fullName: 'Certified Pediatric Nurse',
      issuingBodies: ['PNCB'],
      specialties: ['pediatrics', 'peds'],
      validityYears: 3
    },

    // Nephrology
    {
      id: 'cnn',
      name: 'CNN',
      fullName: 'Certified Nephrology Nurse',
      issuingBodies: ['NNCC'],
      specialties: ['dialysis', 'nephrology', 'renal'],
      validityYears: 4
    },

    // Wound Care
    {
      id: 'cwocn',
      name: 'CWOCN',
      fullName: 'Certified Wound, Ostomy, Continence Nurse',
      issuingBodies: ['WOCNCB'],
      specialties: ['wound-care', 'ostomy'],
      validityYears: 5
    },

    // Informatics
    {
      id: 'rn-bc-informatics',
      name: 'RN-BC (Informatics)',
      fullName: 'Nursing Informatics Certification',
      issuingBodies: ['ANCC'],
      specialties: ['informatics', 'health-it'],
      validityYears: 5
    },

    // Case Management
    {
      id: 'ccm',
      name: 'CCM',
      fullName: 'Certified Case Manager',
      issuingBodies: ['CCMC'],
      specialties: ['case-management', 'utilization-review'],
      validityYears: 5
    }
  ]
};

// All certifications as flat array for search
export const ALL_CERTIFICATIONS = [
  ...CERTIFICATIONS.required,
  ...CERTIFICATIONS.specialty
];

// ============================================
// LICENSE TYPES
// ============================================

export const LICENSE_TYPES = [
  { id: 'rn', name: 'RN', fullName: 'Registered Nurse' },
  { id: 'aprn', name: 'APRN', fullName: 'Advanced Practice Registered Nurse' },
  { id: 'lpn', name: 'LPN', fullName: 'Licensed Practical Nurse' },
  { id: 'lvn', name: 'LVN', fullName: 'Licensed Vocational Nurse (TX/CA)' },
];

// ============================================
// NURSE LICENSURE COMPACT (NLC) STATES
// ============================================

export const NLC_STATES = [
  'AL', 'AZ', 'AR', 'CO', 'DE', 'FL', 'GA', 'ID', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MS', 'MO', 'MT', 'NE', 'NH',
  'NJ', 'NM', 'NC', 'ND', 'OH', 'OK', 'SC', 'SD', 'TN', 'TX',
  'UT', 'VA', 'VT', 'WV', 'WI', 'WY'
];

export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'GU', name: 'Guam' },
  { code: 'VI', name: 'Virgin Islands' }
];

// ============================================
// EHR/EMR SYSTEMS
// ============================================

export const EHR_SYSTEMS = [
  // Hospital / Acute Care
  { id: 'epic', name: 'Epic', description: 'Most common in large hospitals' },
  { id: 'cerner', name: 'Cerner (Oracle Health)', description: 'Very common' },
  { id: 'meditech', name: 'Meditech', description: 'Common in community hospitals' },
  { id: 'allscripts', name: 'Allscripts', description: 'Common' },
  { id: 'cpsi', name: 'CPSI', description: 'Community hospitals' },
  // Outpatient / Ambulatory
  { id: 'eclinicalworks', name: 'eClinicalWorks', description: 'Popular in outpatient' },
  { id: 'nextgen', name: 'NextGen Healthcare', description: 'Outpatient & ambulatory' },
  { id: 'athenahealth', name: 'athenahealth', description: 'Outpatient & practices' },
  { id: 'veradigm', name: 'Veradigm (Allscripts)', description: 'Ambulatory care' },
  { id: 'kareo', name: 'Kareo', description: 'Small practices' },
  // Long-Term Care / Home Health / Behavioral Health
  { id: 'pointclickcare', name: 'PointClickCare', description: 'Long-term care & SNFs' },
  { id: 'netsmart', name: 'Netsmart', description: 'Behavioral health & substance abuse' },
  { id: 'homecare-homebase', name: 'HomeCare HomeBase', description: 'Home health agencies' },
  { id: 'matrixcare', name: 'MatrixCare', description: 'Senior living & home health' },
  { id: 'drchrono', name: 'DrChrono', description: 'Small practices' }
];

// ============================================
// NURSING SPECIALTIES
// ============================================

export const NURSING_SPECIALTIES = [
  { id: 'icu', name: 'ICU / Critical Care', keywords: ['ICU', 'MICU', 'SICU', 'CCU', 'Critical Care'] },
  { id: 'er', name: 'Emergency / Trauma', keywords: ['ER', 'ED', 'Emergency', 'Trauma'] },
  { id: 'med-surg', name: 'Medical-Surgical', keywords: ['Med-Surg', 'Medical Surgical', 'General'] },
  { id: 'labor-delivery', name: 'Labor & Delivery', keywords: ['L&D', 'OB', 'Labor', 'Delivery', 'Obstetrics'] },
  { id: 'postpartum', name: 'Postpartum / Mother-Baby', keywords: ['Postpartum', 'Mother Baby', 'Couplet Care'] },
  { id: 'nicu', name: 'NICU', keywords: ['NICU', 'Neonatal', 'Newborn ICU'] },
  { id: 'pediatrics', name: 'Pediatrics', keywords: ['Peds', 'Pediatric', 'Children'] },
  { id: 'or', name: 'Operating Room / Perioperative', keywords: ['OR', 'Surgery', 'Perioperative', 'PACU'] },
  { id: 'cardiac', name: 'Cardiac / Cath Lab', keywords: ['Cardiac', 'Cath Lab', 'Cardiology', 'CVICU'] },
  { id: 'oncology', name: 'Oncology', keywords: ['Oncology', 'Cancer', 'Chemo'] },
  { id: 'telemetry', name: 'Telemetry / Step-Down', keywords: ['Tele', 'Telemetry', 'PCU', 'Step-Down'] },
  { id: 'neuro', name: 'Neurology / Neuro ICU', keywords: ['Neuro', 'Neurology', 'Stroke'] },
  { id: 'dialysis', name: 'Dialysis / Nephrology', keywords: ['Dialysis', 'Hemo', 'Renal', 'Nephrology'] },
  { id: 'psych', name: 'Psychiatric / Mental Health', keywords: ['Psych', 'Mental Health', 'Behavioral Health'] },
  { id: 'home-health', name: 'Home Health', keywords: ['Home Health', 'Home Care', 'Visiting'] },
  { id: 'hospice', name: 'Hospice / Palliative', keywords: ['Hospice', 'Palliative', 'End of Life'] },
  { id: 'rehab', name: 'Rehabilitation', keywords: ['Rehab', 'Rehabilitation', 'SNF'] },
  { id: 'outpatient', name: 'Outpatient / Clinic', keywords: ['Outpatient', 'Clinic', 'Ambulatory'] },
  { id: 'case-management', name: 'Case Management', keywords: ['Case Management', 'Utilization Review', 'UR'] },
  { id: 'school', name: 'School Nursing', keywords: ['School', 'Student Health'] },
  { id: 'infusion', name: 'Infusion', keywords: ['Infusion', 'IV Therapy'] },
  { id: 'wound-care', name: 'Wound Care', keywords: ['Wound', 'Ostomy', 'WOC'] },
  { id: 'float-pool', name: 'Float Pool', keywords: ['Float', 'Resource', 'PRN'] },
  { id: 'travel', name: 'Travel Nursing', keywords: ['Travel', 'Contract', 'Agency'] }
];

// ============================================
// CLINICAL SKILLS BY SPECIALTY
// ============================================

export const SKILLS_BY_SPECIALTY = {
  // Core skills for ALL specialties
  'core': [
    'Patient Assessment',
    'Medication Administration',
    'IV Therapy',
    'Wound Care',
    'Patient Education',
    'Care Planning',
    'Documentation',
    'Vital Signs Monitoring',
    'Infection Control',
    'Fall Prevention'
  ],

  'icu': [
    'Ventilator Management',
    'Hemodynamic Monitoring',
    'Arterial Line Management',
    'Central Line Care',
    'CRRT/Continuous Dialysis',
    'Sedation Management',
    'Vasopressor Titration',
    'Blood Product Administration',
    'Code Blue Response',
    'Rapid Response',
    'Swan-Ganz Catheter',
    'IABP Management',
    'ECMO Care',
    'Prone Positioning',
    'Neuromuscular Blockade'
  ],

  'er': [
    'Triage Assessment',
    'Trauma Care',
    'Cardiac Monitoring',
    'Procedural Sedation',
    'Splinting/Casting',
    'Suturing Assistance',
    'Point of Care Testing',
    'Mass Casualty Response',
    'Sexual Assault Examination',
    'Psychiatric Evaluation',
    'Chest Tube Management',
    'Rapid Infuser',
    'Stroke Protocol',
    'STEMI Protocol'
  ],

  'labor-delivery': [
    'Fetal Heart Monitoring',
    'Labor Support',
    'Epidural Monitoring',
    'Pitocin Administration',
    'Cesarean Section Assistance',
    'Vaginal Delivery Assistance',
    'Newborn Resuscitation',
    'High-Risk Pregnancy',
    'Postpartum Hemorrhage',
    'Shoulder Dystocia',
    'Cord Prolapse',
    'Magnesium Sulfate',
    'Perineal Repair Assistance'
  ],

  'nicu': [
    'Premature Infant Care',
    'Neonatal Ventilation',
    'Phototherapy',
    'Umbilical Line Care',
    'Gavage Feeding',
    'Developmental Care',
    'Kangaroo Care',
    'Neonatal Resuscitation',
    'Thermoregulation',
    'PICC Line Care',
    'Total Parenteral Nutrition',
    'Surfactant Administration'
  ],

  'pediatrics': [
    'Growth & Development Assessment',
    'Pediatric Vital Signs',
    'Weight-Based Dosing',
    'Family-Centered Care',
    'Child Life Coordination',
    'Pediatric Pain Assessment',
    'Immunization Administration',
    'Pediatric IV Insertion',
    'Child Abuse Recognition'
  ],

  'or': [
    'Sterile Technique',
    'Surgical Positioning',
    'Instrument Handling',
    'Surgical Counts',
    'Anesthesia Support',
    'Patient Preparation',
    'Specimen Handling',
    'Tourniquet Management',
    'Electrosurgery',
    'Laser Safety',
    'Malignant Hyperthermia',
    'Robotic Surgery'
  ],

  'cardiac': [
    'Cardiac Rhythm Interpretation',
    '12-Lead ECG',
    'Cardiac Catheterization',
    'TAVR Procedure',
    'Pacemaker Care',
    'Defibrillator Management',
    'Cardiac Rehabilitation',
    'Heart Failure Management',
    'Anticoagulation Therapy',
    'Post-PCI Care',
    'Femoral Sheath Removal'
  ],

  'oncology': [
    'Chemotherapy Administration',
    'Central Line Access',
    'Port-a-Cath Care',
    'Oncologic Emergencies',
    'Blood Product Transfusion',
    'Symptom Management',
    'Palliative Care',
    'Radiation Safety',
    'Immunotherapy',
    'Bone Marrow Transplant'
  ],

  'dialysis': [
    'Hemodialysis',
    'Peritoneal Dialysis',
    'Fistula/Graft Assessment',
    'Cannulation',
    'Dialysis Machine Operation',
    'Fluid Balance',
    'Electrolyte Management',
    'Vascular Access Care',
    'Continuous Renal Replacement'
  ],

  'psych': [
    'Mental Status Examination',
    'Crisis Intervention',
    'De-escalation Techniques',
    'Suicide Risk Assessment',
    'Restraint Application',
    'Psychiatric Medication',
    'Group Therapy Facilitation',
    'Therapeutic Communication',
    'Behavioral Intervention'
  ],

  'home-health': [
    'Home Safety Assessment',
    'Wound Care',
    'Medication Reconciliation',
    'PICC Line Care',
    'Enteral Feeding',
    'Foley Catheter',
    'Ostomy Care',
    'Fall Risk Assessment',
    'Caregiver Education',
    'Home Ventilator',
    'Insulin Administration'
  ],

  'telemetry': [
    'Cardiac Rhythm Interpretation',
    'Telemetry Monitoring',
    'Cardiac Drip Titration',
    'Rapid Response',
    'Post-Surgical Care',
    'Chest Pain Protocol',
    'Anticoagulation Therapy',
    'Heart Failure Management',
    '12-Lead ECG',
    'Blood Transfusion',
    'Cardiac Rehabilitation'
  ],

  'neuro': [
    'Neurological Assessment',
    'NIH Stroke Scale',
    'Stroke Protocol',
    'ICP Monitoring',
    'Seizure Management',
    'EVD Management',
    'Lumbar Drain Care',
    'Craniotomy Post-Op Care',
    'Spinal Cord Injury Care',
    'Glasgow Coma Scale',
    'Brain Death Assessment',
    'Neuro Checks Q1-2h'
  ],

  'rehab': [
    'Functional Independence Measure',
    'Mobility Assessment',
    'Transfer Techniques',
    'Bladder Retraining',
    'Dysphagia Management',
    'Orthopedic Post-Op Care',
    'Stroke Rehabilitation',
    'Pain Management',
    'Assistive Device Training',
    'Discharge Planning',
    'ADL Assessment'
  ],

  'outpatient': [
    'Triage Assessment',
    'Medication Administration',
    'Patient Scheduling',
    'Pre-Visit Planning',
    'Chronic Disease Management',
    'Immunization Administration',
    'Patient Education',
    'Phone Triage',
    'Prior Authorization',
    'Lab Result Review'
  ],

  'case-management': [
    'Utilization Review',
    'Discharge Planning',
    'Insurance Authorization',
    'Care Coordination',
    'Interdisciplinary Rounds',
    'Length of Stay Optimization',
    'Patient Advocacy',
    'Resource Allocation',
    'Readmission Prevention',
    'Social Determinants Assessment'
  ],

  'school': [
    'Health Screening',
    'Diabetes Management',
    'Emergency Action Plans',
    'Asthma Management',
    'Seizure Management',
    'Medication Administration',
    'Allergy/Anaphylaxis Response',
    'Mental Health Screening',
    'Immunization Compliance',
    'Student Health Education'
  ],

  'infusion': [
    'PICC Line Care',
    'Port Access & De-access',
    'Central Line Management',
    'Chemotherapy Administration',
    'Blood Product Transfusion',
    'Anaphylaxis Response',
    'IV Insertion',
    'Infusion Pump Management',
    'Biologic Therapy',
    'Fluid & Electrolyte Management'
  ],

  'wound-care': [
    'Wound Assessment & Staging',
    'Negative Pressure Therapy (Wound VAC)',
    'Debridement Assistance',
    'Compression Therapy',
    'Ostomy Care & Education',
    'Skin Graft Care',
    'Burn Wound Management',
    'Diabetic Foot Care',
    'Hyperbaric Oxygen Therapy',
    'Wound Photography & Documentation'
  ],

  'float-pool': [
    'Multi-Unit Competency',
    'Rapid Unit Orientation',
    'Cross-Training',
    'Cardiac Monitoring',
    'Ventilator Management',
    'Charge Nurse Support',
    'Flexible Scheduling',
    'Diverse Patient Populations',
    'Critical Thinking Under Pressure',
    'Rapid Assessment'
  ],

  'travel': [
    'Rapid Onboarding',
    'Multi-EHR Proficiency',
    'Adaptability',
    'Compact Licensure',
    'Cross-Facility Compliance',
    'Self-Directed Practice',
    'Multi-Specialty Competency',
    'Crisis Staffing',
    'Diverse Patient Populations',
    'Rapid Unit Orientation'
  ],

  'hospice': [
    'End-of-Life Care',
    'Comfort Measures',
    'Pain & Symptom Management',
    'Family/Caregiver Support',
    'Advance Directive Education',
    'Bereavement Support',
    'Spiritual Care Coordination',
    'Palliative Medication Management',
    'Death Pronouncement',
    'Interdisciplinary Team Collaboration'
  ],

  'postpartum': [
    'Postpartum Assessment',
    'Breastfeeding Support',
    'Newborn Assessment',
    'Couplet Care',
    'Postpartum Hemorrhage Management',
    'Circumcision Care',
    'Newborn Screening',
    'Car Seat Safety',
    'Maternal Mental Health Screening',
    'Discharge Teaching'
  ]
};

// ============================================
// EXPERIENCE BULLET POINTS BY ROLE
// ============================================

export const EXPERIENCE_BULLETS = {
  'staff-nurse': [
    'Provided comprehensive patient care for {patientCount} patients per shift',
    'Administered medications via IV, PO, IM, and subcutaneous routes',
    'Monitored and assessed patient conditions, reporting changes to physicians',
    'Collaborated with interdisciplinary team to develop care plans',
    'Documented patient care accurately and timely in EMR',
    'Educated patients and families on disease processes and discharge instructions',
    'Maintained compliance with infection control protocols',
    'Participated in quality improvement initiatives'
  ],

  'charge-nurse': [
    'Led nursing team of {staffCount} nurses and support staff',
    'Coordinated patient admissions, discharges, and transfers',
    'Managed bed assignments and patient flow',
    'Served as resource for clinical questions and emergencies',
    'Delegated tasks and supervised nursing assistants',
    'Communicated with physicians regarding patient concerns',
    'Mentored new nurses during orientation period',
    'Resolved patient and family complaints professionally'
  ],

  'travel-nurse': [
    'Adapted quickly to new hospital systems and protocols',
    'Maintained flexibility across multiple units and specialties',
    'Achieved full productivity within {days} days of assignment start',
    'Documented in various EMR systems including {systems}',
    'Met all facility compliance and credentialing requirements',
    'Collaborated effectively with permanent staff'
  ],

  'preceptor': [
    'Precepted {count} new graduate nurses through orientation',
    'Developed individualized learning plans based on competency assessments',
    'Provided constructive feedback and documented progress',
    'Ensured competency in unit-specific skills and protocols',
    'Collaborated with education department on curriculum improvements'
  ]
};

// ============================================
// METRIC OPTIONS (for AI metric drawer)
// ============================================

export const METRIC_OPTIONS = {
  patientRatio: {
    label: 'Patient Ratio',
    icon: '👥',
    options: ['1:1', '1:2', '1:4', '1:6', '1:8', '1:10', '1:12']
  },
  bedCount: {
    label: 'Unit Beds',
    icon: '🛏️',
    options: ['10', '15', '20', '25', '30', '40', '50+']
  },
  ehrSystem: {
    label: 'EHR System',
    icon: '💻',
    useExisting: true
  },
  achievement: {
    label: 'Key Achievement',
    icon: '🏆',
    options: [
      'Reduced falls',
      'Improved patient satisfaction',
      'Decreased readmissions',
      'Reduced medication errors',
      'Trained new staff',
      'Led quality improvement',
      'Reduced infection rates',
      'Improved documentation compliance'
    ]
  }
};

// ============================================
// POSITION TYPES
// ============================================

export const POSITION_TYPES = [
  { id: 'staff-nurse', name: 'Staff Nurse' },
  { id: 'charge-nurse', name: 'Charge Nurse' },
  { id: 'clinical-nurse', name: 'Clinical Nurse' },
  { id: 'travel-nurse', name: 'Travel Nurse' },
  { id: 'per-diem', name: 'Per Diem / PRN' },
  { id: 'float-nurse', name: 'Float Pool Nurse' },
  { id: 'nurse-manager', name: 'Nurse Manager' },
  { id: 'assistant-manager', name: 'Assistant Nurse Manager' },
  { id: 'clinical-lead', name: 'Clinical Lead' },
  { id: 'educator', name: 'Nurse Educator' },
  { id: 'case-manager', name: 'Case Manager' },
  { id: 'utilization-review', name: 'Utilization Review Nurse' },
  { id: 'informatics', name: 'Informatics Nurse' },
  { id: 'research', name: 'Research Nurse' }
];

// ============================================
// NURSING DEGREES
// ============================================

export const NURSING_DEGREES = [
  { id: 'adn', name: 'ADN', fullName: 'Associate Degree in Nursing' },
  { id: 'asn', name: 'ASN', fullName: 'Associate of Science in Nursing' },
  { id: 'bsn', name: 'BSN', fullName: 'Bachelor of Science in Nursing' },
  { id: 'msn', name: 'MSN', fullName: 'Master of Science in Nursing' },
  { id: 'dnp', name: 'DNP', fullName: 'Doctor of Nursing Practice' },
  { id: 'phd', name: 'PhD', fullName: 'Doctor of Philosophy in Nursing' }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get suggested certifications based on specialty
 */
export function getSuggestedCertifications(specialtyId) {
  const required = CERTIFICATIONS.required;
  const specialty = CERTIFICATIONS.specialty.filter(cert =>
    cert.specialties && cert.specialties.includes(specialtyId)
  );
  return { required, specialty };
}

/**
 * Get suggested skills based on specialty
 */
export function getSuggestedSkills(specialtyId) {
  const coreSkills = SKILLS_BY_SPECIALTY['core'] || [];
  const specialtySkills = SKILLS_BY_SPECIALTY[specialtyId] || [];
  return [...specialtySkills, ...coreSkills];
}

/**
 * Check if state is part of Nurse Licensure Compact
 */
export function isCompactState(stateCode) {
  return NLC_STATES.includes(stateCode);
}

/**
 * Get state name from code
 */
export function getStateName(stateCode) {
  const state = US_STATES.find(s => s.code === stateCode);
  return state ? state.name : stateCode;
}

/**
 * Get certification by ID
 */
export function getCertificationById(certId) {
  return ALL_CERTIFICATIONS.find(cert => cert.id === certId);
}
