#!/usr/bin/env node

/**
 * Populate DeletedJob Table
 * 
 * This script takes a list of deleted job URLs and populates the DeletedJob table
 * so we can return 410 Gone instead of 404 Not Found (better SEO).
 * 
 * Usage:
 *   node scripts/populate-deleted-jobs.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// List of deleted job URLs from Google Search Console
const deletedUrls = [
  "https://intelliresume.net/jobs/nursing/rn-practitioner-physician-assistant-clinical-cleveland-oh-22112867",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-willoughby-oh-22116946",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-med-surg-telemetry-canton-oh-22061722",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-cleveland-oh-22126754",
  "https://intelliresume.net/jobs/nursing/rn-ortho-medical-surgical-cleveland-oh-22112666",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-mayfield-oh-22108436",
  "https://intelliresume.net/jobs/nursing/additional-case-unit-with-beach-h-22384040",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-mayfield-heights-oh-22355831-22369961",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-willoughby-oh-22099437",
  "https://intelliresume.net/jobs/nursing/assistant-nurse-manager-general-surgery-systems-ow-field-hts-oh-22229198",
  "https://intelliresume.net/jobs/nursing/rn-transplant-specialty-nurse-coordinator-cleveland-oh-22323806",
  "https://intelliresume.net/jobs/nursing/rn-vascular-access-service-cleveland-oh-22107882",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-cardiac-telemetry-and-medical-akron-oh-22379652",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-mayfield-heights-oh-22345177",
  "https://intelliresume.net/jobs/nursing/rn-adult-med-surg-float-bh-oh-22107608",
  "https://intelliresume.net/jobs/nursing/rn-assistant-manager-parma-oh-22116857",
  "https://intelliresume.net/jobs/nursing/rn-chf-neurology-medford-oh-22332452",
  "https://intelliresume.net/jobs/nursing/rn-practitioner-physician-assistant-clinical-clin-exam-oh-22513822",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-oh-22104755",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-cleveland-oh-22126748",
  "https://intelliresume.net/jobs/nursing/rn-emergency-department-ed-avon-mountho-his-oh-22581163",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-willoughby-oh-22109515",
  "https://intelliresume.net/jobs/nursing/rn-htn-andholic-or-digestive-disease-institute-cleveland-oh-22579922",
  "https://intelliresume.net/jobs/nursing/rn-pediatric-transport-rn-willoughby-oh-22227680",
  "https://intelliresume.net/jobs/nursing/assistant-nurse-manager-medical-surgical-cleveland-oh-22121908",
  "https://intelliresume.net/jobs/nursing/new-pediatric-cath-lab-and-ges-cleveleand-oh-22136258",
  "https://intelliresume.net/jobs/nursing/assistant-nurse-manager-transplant-general-surge-cleveland-oh-22040477",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-cleveland-oh-22102997",
  "https://intelliresume.net/jobs/nursing/new-ed-gi-picnic-physician-aprin-exam-cath-ex-pis-aldo-uti-oh-22073644",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-cleveland-oh-22103118",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-willoughby-oh-22165949",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-surgery-center-asc-walker-center-ppt-cleveland-oh-22110317",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-cleveland-oh-22102993",
  "https://intelliresume.net/jobs/nursing/rn-post-operative-care-unit-cleveland-oh-22347234",
  "https://intelliresume.net/jobs/nursing/nursing-support-specialist-health-coordinator-willoughby-oh-22106691",
  "https://intelliresume.net/jobs/nursing/ambulatory-allergy-on-regional-float-cleveland-oh-22567148",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-willoughby-oh-22143826",
  "https://intelliresume.net/jobs/nursing/rn-internal-medicine-cleveland-oh-22220767",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-willoughby-oh-22084308",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-willoughby-oh-22167949",
  "https://intelliresume.net/jobs/nursing/assistant-nurse-manager-surgical-oc-uti-oh-22056540",
  "https://intelliresume.net/jobs/nursing/rn-post-operative-care-unit-postanesthesia-care-un-cleveland-oh-22056564",
  "https://intelliresume.net/jobs/nursing/medical-surgical-and-telemetry-canton-oh-22084088",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-internal-medicine-cleveland-oh-22052758",
  "https://intelliresume.net/jobs/nursing/rn-cardiovascular-crology-cleveland-oh-22121553",
  "https://intelliresume.net/jobs/nursing/rn-nurse-navigator-oncology-medford-oh-22120443",
  "https://intelliresume.net/jobs/nursing/assistant-nurse-manager-post-operative-care-unit-cleveland-oh-22325994",
  "https://intelliresume.net/jobs/nursing/rn-oncology-med-surg-cleveland-oh-22140052",
  "https://intelliresume.net/jobs/nursing/rn-acute-care-pain-service-cleveland-oh-22118290",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-cleveland-oh-22126708",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-cleveland-oh-22422094",
  "https://intelliresume.net/jobs/nursing/rn-operating-room-cirugs-h-22099440",
  "https://intelliresume.net/jobs/nursing/rn-er-labor-and-delivery-willoughby-oh-22087925",
  "https://intelliresume.net/jobs/nursing/rn-surgery-unit-ortho-urology-willoughby-oh-22152612",
  "https://intelliresume.net/jobs/nursing/assistant-nurse-manager-ambulatory-card-cleveland-oh-22346906",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-cardiology-medicine-clevel-b-22149096",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-mayfield-oh-22195088",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-mayfield-heights-oh-22339401",
  "https://intelliresume.net/jobs/nursing/medical-or-emergency-health-nurse-swim-beach-h-22350086",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-mayfield-oh-22191956",
  "https://intelliresume.net/jobs/nursing/pediatric-radiology-or-willoughby-oh-22154866",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-asc-exaltli-oh-22193510",
  "https://intelliresume.net/jobs/nursing/rn-float-pool-internal-medicine-cleveland-oh-22092896",
  "https://intelliresume.net/jobs/nursing/rn-maternal-fetal-surgery-mayfield-hts-oh-22349969",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-willoughby-oh-22109476",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-cleveland-oh-22296096",
  "https://intelliresume.net/jobs/nursing/rn-internal-medicine-cleveland-oh-22204289",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-ortho-dermatology-mayfield-hts-oh-22126052",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-cleveland-oh-22321904",
  "https://intelliresume.net/jobs/nursing/rn-float-surgery-mayfield-hts-oh-22050572",
  "https://intelliresume.net/jobs/nursing/rn-assistant-manager-new-willoughby-oh-22113556",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-cleveland-oh-22126752",
  "https://intelliresume.net/jobs/nursing/rn-pediatrics-cleveland-oh-22052424",
  "https://intelliresume.net/jobs/nursing/assistant-nurse-manager-surgery-willoughby-oh-22091166",
  "https://intelliresume.net/jobs/nursing/diabetic-ish-waterresearch-hts-on-22051186",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-cleveland-oh-22126699",
  "https://intelliresume.net/jobs/nursing/rn-float-pool-acute-nurse-case-manager-cleveland-oh-22347594",
  "https://intelliresume.net/jobs/nursing/rn-stroke-marshall-hts-oh-22113206",
  "https://intelliresume.net/jobs/nursing/rn-ortho-surgical-parma-oh-22162874",
  "https://intelliresume.net/jobs/nursing/rn-care-coordinator-orthopedic-cleveland-oh-22093392",
  "https://intelliresume.net/jobs/nursing/rn-behavioral-health-cleveland-oh-22327683",
  "https://intelliresume.net/jobs/nursing/rn-waterresearch-hts-oh-22051603",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-mayfield-oh-22191955",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-medical-surgical-beachweoh-oh-22125862",
  "https://intelliresume.net/jobs/nursing/rn-per-diem-emergency-department-ed-emergency-swim-beach-h-22315563",
  "https://intelliresume.net/jobs/nursing/rn-med-surg-mayfield-hts-oh-22100091",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-mayfield-oh-22165996",
  "https://intelliresume.net/jobs/nursing/rn-pediatric-and-spine-cleveland-oh-22144217",
  "https://intelliresume.net/jobs/nursing/rn-transplant-specialty-nurse-coordinator-gastroenterology-obs-oh-22128152",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-cleveland-oh-22126737",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-mayfield-oh-22168438",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-digest-amid-detroit-l-westlake-oh-22517327",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-cleveland-oh-22126662",
  "https://intelliresume.net/jobs/nursing/research-h-nurse-oncology-mayfield-hts-oh-22110117",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-cleveland-oh-22126750",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-willoughby-oh-22094617",
  "https://intelliresume.net/jobs/nursing/rn-pediatrics-cleveland-oh-22052404",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-palliative-care-center-of-cleveland-oh-22291699",
  "https://intelliresume.net/jobs/nursing/rn-maternity-nurse-unit-clevel-oh-22121096",
  "https://intelliresume.net/jobs/nursing/maternity-cardiac-unit-swim-beach-h-22131006",
  "https://intelliresume.net/jobs/nursing/rn-emergency-department-ed-emergency-swim-beach-h-22075865",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-ambulan-canton-oh-22079663",
  "https://intelliresume.net/jobs/nursing/rn-vascular-access-service-cleveland-oh-22107806",
  "https://intelliresume.net/jobs/nursing/rn-co-program-beach-h-22219300",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-surgery-center-asc-mayfield-hts-oh-22322115",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-cleveland-oh-22102828",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-cleveland-oh-22126742",
  "https://intelliresume.net/jobs/nursing/rn-endoscopy-unit-cleveland-oh-22051903",
  "https://intelliresume.net/jobs/nursing/rn-medical-surgical-and-gastro-pain-operations-oh-22128132",
  "https://intelliresume.net/jobs/nursing/rn-assistant-manager-adult-icu-mayfield-hts-oh-22200668",
  "https://intelliresume.net/jobs/nursing/rn-resident-adult-icu-willoughby-oh-22071832",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-willoughby-oh-22214854",
  "https://intelliresume.net/jobs/nursing/hospital-clinical-lab-teleph-telephonist-cleveland-oh-22126021",
  "https://intelliresume.net/jobs/nursing/rn-assistant-manager-ambulatory-cleveland-oh-22328111",
  "https://intelliresume.net/jobs/nursing/rn-assistant-manager-ambulatory-cleveland-oh-22223111",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-mayfield-oh-22108437",
  "https://intelliresume.net/jobs/nursing/rn-practitioner-physician-assistant-hospital-on-exam-h-22090049",
  "https://intelliresume.net/jobs/nursing/nursing-support-specialist-transplant-cleveland-oh-22105068",
  "https://intelliresume.net/jobs/nursing/assistant-nurse-manager-emergency-department-ed-emergency-ob-22321865",
  "https://intelliresume.net/jobs/nursing/rn-nurse-administrator-specialist-home-care-med-swim-inlargesroute-oh-22118815",
  "https://intelliresume.net/jobs/nursing/rn-radiology-intensive-care-unit-swim-cleveland-oh-22060481",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-cleveland-oh-22060613",
  "https://intelliresume.net/jobs/nursing/assistant-nurse-manager-emergency-department-ed-cleveland-oh-22096613",
  "https://intelliresume.net/jobs/nursing/rn-general-education-cleveland-oh-22118632",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-medical-surgical-cleveland-oh-22117491",
  "https://intelliresume.net/jobs/nursing/rn-maternity-nurse-willoughby-oh-22069612",
  "https://intelliresume.net/jobs/nursing/rn-resident-orthopedic-aisle-spine-cleveland-oh-22283600",
  "https://intelliresume.net/jobs/nursing/rn-med-surg-medford-hts-oh-22162810",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-willoughby-oh-22167830",
  "https://intelliresume.net/jobs/nursing/rn-labor-and-delivery-swim-clevel-hb-oh-22382827",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-mayfield-oh-22108429",
  "https://intelliresume.net/jobs/nursing/rn-specialist-h-wound-ostomy-continuum-akron-oh-22073018",
  "https://intelliresume.net/jobs/nursing/rn-cardiovascular-progressive-care-unit-cleveland-oh-22082569",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-avon-oh-22321665",
  "https://intelliresume.net/jobs/nursing/new-head-oh-regional-provider-aprin-clin-ohio-driven-oh-22070017",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-willoughby-oh-22089644",
  "https://intelliresume.net/jobs/nursing/rn-emergency-department-33pm-11pm-variable-start-akron-oh-22286825",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-oncology-cleveland-oh-22129911",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-cleveland-oh-22126716",
  "https://intelliresume.net/jobs/nursing/assistant-nurse-manager-medical-surgical-cleveland-oh-22113624",
  "https://intelliresume.net/jobs/nursing/ambulatory-cardiology-cleveland-oh-22139613",
  "https://intelliresume.net/jobs/nursing/rn-resident-cardinal-clinic-h-oh-22119881",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-willoughby-oh-22106009",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-cleveland-oh-22296089",
  "https://intelliresume.net/jobs/nursing/rn-surgical-icu-cleveland-oh-22147052",
  "https://intelliresume.net/jobs/nursing/rn-operating-room-medford-hts-oh-22050649",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-surgery-center-asc-mayfield-hts-oh-22056649",
  "https://intelliresume.net/jobs/nursing/rn-emergency-department-ed-parma-oh-22295637",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-oh-22008088",
  "https://intelliresume.net/jobs/nursing/assistant-nurse-manager-h-cleveland-oh-22412975",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-mayfield-oh-22165933",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-cleveland-oh-22126707",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-willoughby-oh-22106020",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-mayfield-oh-22191954",
  "https://intelliresume.net/jobs/nursing/assistant-nurse-manager-medical-oh-med-field-hts-oh-22269111",
  "https://intelliresume.net/jobs/nursing/rn-operating-room-mayfield-hts-oh-22050648",
  "https://intelliresume.net/jobs/nursing/rn-transplant-specialty-nurse-coordinator-cleveland-oh-22297597",
  "https://intelliresume.net/jobs/nursing/rn-clinical-resource-nurse-willoughby-oh-22143804",
  "https://intelliresume.net/jobs/nursing/rn-ortho-icu-cleveland-oh-22092896",
  "https://intelliresume.net/jobs/nursing/rn-transplant-infusion-center-cleveland-oh-22350969",
  "https://intelliresume.net/jobs/nursing/rn-research-cleveland-oh-22141321",
  "https://intelliresume.net/jobs/nursing/rn-solid-surg-parma-oh-22142835",
  "https://intelliresume.net/jobs/nursing/rn-emergency-department-ed-cleveland-oh-22228620",
  "https://intelliresume.net/jobs/nursing/assistant-nurse-manager-senior-oh-mayfield-hts-oh-22269111",
  "https://intelliresume.net/jobs/nursing/rn-adult-icu-mayfield-hts-oh-22122832",
  "https://intelliresume.net/resume-builder",
  "https://intelliresume.net/jobs/nursing/rn-genetics-gastro-clevel-cleveland-oh-22246859",
];

async function main() {
  console.log('🚀 Populating DeletedJob table...\n');
  
  // Extract slugs from URLs
  const slugs = deletedUrls.map(url => {
    // Extract slug from URL: https://intelliresume.net/jobs/nursing/[slug]
    const match = url.match(/\/jobs\/nursing\/(.+)$/);
    return match ? match[1] : null;
  }).filter(slug => slug !== null);
  
  console.log(`📊 Found ${slugs.length} job slugs to add\n`);
  
  // Check if any already exist
  const existing = await prisma.deletedJob.findMany({
    where: {
      slug: { in: slugs }
    },
    select: { slug: true }
  });
  
  const existingSlugs = new Set(existing.map(d => d.slug));
  const newSlugs = slugs.filter(slug => !existingSlugs.has(slug));
  
  console.log(`✅ ${existing.length} slugs already in DeletedJob table`);
  console.log(`➕ ${newSlugs.length} new slugs to add\n`);
  
  if (newSlugs.length === 0) {
    console.log('✨ Nothing to do - all slugs already tracked!');
    return;
  }
  
  // Insert new deleted jobs
  const result = await prisma.deletedJob.createMany({
    data: newSlugs.map(slug => ({
      slug,
      reason: 'Google Search Console 404 cleanup - Nov 2025'
    })),
    skipDuplicates: true
  });
  
  console.log(`✅ Added ${result.count} deleted job records\n`);
  console.log('🎉 Done! These URLs will now return 410 Gone instead of 404 Not Found.');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

