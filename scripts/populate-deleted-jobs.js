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

// List of deleted job URLs from Google Search Console (Nov 2025)
const deletedUrls = [
  "https://intelliresume.net/jobs/nursing/nurse-practitioner-physician-assistant-or-clinical-cleveland-oh-22112467",
  "https://intelliresume.net/jobs/nursing/rn-progressive-care-unit-mayfield-hts-oh-22386598",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-team-lead-internal-medicine-willoughby-hills-oh-22459181",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-med-surg-telemetry-canton-oh-22581722",
  "https://intelliresume.net/jobs/nursing/registered-nurse-rn-pediatric-cath-lab-pacu-cleveland-oh-22351308",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-intensive-care-unit-icu-mayfield-hts-oh-22383455",
  "https://intelliresume.net/jobs/nursing/rn-urology-medical-surgical-cleveland-oh-22112486",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-euclid-oh-22310767",
  "https://intelliresume.net/jobs/nursing/medical-surgical-rn-4-east-part-time-days-vero-beach-fl-22305107",
  "https://intelliresume.net/jobs/nursing/rn-cardiac-step-down-canton-oh-22146936",
  "https://intelliresume.net/jobs/nursing/rn-additional-care-unit-vero-beach-fl-22466440",
  "https://intelliresume.net/jobs/nursing/prn-rn-digestive-disease-post-op-cleveland-oh-22169841",
  "https://intelliresume.net/jobs/nursing/rn-hospital-bu-4e-days-med-surg-vero-beach-fl-22160958",
  "https://intelliresume.net/jobs/nursing/assistant-nurse-manager-general-surgery-inpatient-mayfield-hts-oh-22221858",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-general-surgery-orthopedic-sp-cleveland-oh-22370450",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-surgery-center-asc-cole-eye-main-cam-cleveland-oh-22553415",
  "https://intelliresume.net/jobs/nursing/registered-nurse-rn-night-shift-med-surg-ortho-neu-rockville-md-591202",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-cardiac-telemetry-and-nephrol-akron-oh-22370662",
  "https://intelliresume.net/jobs/nursing/rn-rapid-response-cvicu-stuart-fl-22115816",
  "https://intelliresume.net/jobs/nursing/rn-cardiac-stepdown-vero-beach-fl-22113002",
  "https://intelliresume.net/jobs/nursing/rn-bu-cardiac-stepdown-ft-nights-vero-beach-fl-22233252",
  "https://intelliresume.net/jobs/nursing/rn-med-surg-mayfield-hts-oh-22107808",
  "https://intelliresume.net/jobs/nursing/rn-pediatric-icu-stepdown-cleveland-oh-22150380",
  "https://intelliresume.net/jobs/nursing/rn-nicu-mayfield-hts-oh-22489673",
  "https://intelliresume.net/jobs/nursing/nurse-pracitioner-physician-assistant-clinical-nur-avon-oh-22513632",
  "https://intelliresume.net/jobs/nursing/rn-med-surg-mayfield-hts-oh-22114390",
  "https://intelliresume.net/jobs/nursing/rn-surgical-intensive-care-unit-cardiovascular-int-weston-fl-22410996",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-surgery-center-asc-pre-post-prn-nigh-beachwood-oh-22520920",
  "https://intelliresume.net/jobs/nursing/rn-emergency-department-ed-warrensville-hts-oh-22591163",
  "https://intelliresume.net/jobs/nursing/education-specialist-rn-day-shift-heart-and-vascul-silver-spring-md-623046",
  "https://intelliresume.net/jobs/nursing/rn-intensive-care-unit-mayfield-hts-oh-22335544",
  "https://intelliresume.net/jobs/nursing/rn-hops-endoscopy-digestive-disease-institute-cleveland-oh-22576922",
  "https://intelliresume.net/jobs/nursing/rn-medical-intensive-care-unit-micu-cleveland-oh-22467451",
  "https://intelliresume.net/jobs/nursing/rn-ccfsr-abdominal-transplant-and-liver-kidney-weston-fl-22309275",
  "https://intelliresume.net/jobs/nursing/international-rn-cleveland-oh-22112320",
  "https://intelliresume.net/jobs/nursing/rn-hops-pediatric-cath-lab-and-pacu-cleveland-oh-22136216",
  "https://intelliresume.net/jobs/nursing/physician-assistant-nurse-practitioner-neurology-d-weston-fl-22294377",
  "https://intelliresume.net/jobs/nursing/rn-dialysis-icu-warrensville-hts-oh-22586293",
  "https://intelliresume.net/jobs/nursing/advanced-practice-provider-aprn-acute-care-pa-cns-akron-oh-22573544",
  "https://intelliresume.net/jobs/nursing/rn-ortho-neuro-trauma-mayfield-hts-oh-22358165",
  "https://intelliresume.net/jobs/nursing/rn-cardiac-stepdown-vero-beach-fl-22316962",
  "https://intelliresume.net/jobs/nursing/rn-emergency-department-ed-cleveland-oh-22113069",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-surgery-center-asc-walker-center-pai-cleveland-oh-22110217",
  "https://intelliresume.net/jobs/nursing/experienced-inpatient-rn-interview-day-weston-10-2-weston-fl-22525972",
  "https://intelliresume.net/jobs/nursing/rn-resident-thoracic-surgery-stepdown-cleveland-oh-22150226",
  "https://intelliresume.net/jobs/nursing/assistant-nurse-manager-anm-transplant-specialty-c-cleveland-oh-22169952",
  "https://intelliresume.net/jobs/nursing/ambulatory-allergy-rn-regional-float-cleveland-oh-22567146",
  "https://intelliresume.net/jobs/nursing/rn-care-coordinator-outpatient-neurology-neuromusc-cleveland-oh-22583182",
  "https://intelliresume.net/jobs/nursing/nurse-practitioner-physician-assistant-or-clinical-canton-oh-22522035",
  "https://intelliresume.net/jobs/nursing/rn-internal-medicine-cleveland-oh-22220757",
  "https://intelliresume.net/jobs/nursing/rn-acute-care-cardiology-and-cardiothoracic-surger-akron-oh-22558410",
  "https://intelliresume.net/jobs/nursing/home-health-rn-west-cuyahoga-county-independence-oh-22525978",
  "https://intelliresume.net/jobs/nursing/rn-cardiac-stepdown-prn-nights-vero-beach-fl-22315277",
  "https://intelliresume.net/jobs/nursing/rn-medical-surgical-and-telemetry-canton-oh-22596098",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-med-surg-cleveland-oh-22107599",
  "https://intelliresume.net/jobs/nursing/rn-med-surg-and-cardiac-care-cleveland-oh-22577774",
  "https://intelliresume.net/jobs/nursing/rn-care-coordinator-urology-cleveland-oh-22319153",
  "https://intelliresume.net/jobs/nursing/rn-critical-care-float-pool-cleveland-oh-22506474",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-med-surg-medina-oh-22567274",
  "https://intelliresume.net/jobs/nursing/experienced-rn-operating-room-akron-oh-22430903",
  "https://intelliresume.net/jobs/nursing/prn-rn-oncology-med-surg-cleveland-oh-22108252",
  "https://intelliresume.net/jobs/nursing/rn-bu-geriatric-psych-vero-beach-fl-22460770",
  "https://intelliresume.net/jobs/nursing/prn-rn-operating-room-cleveland-oh-22115154",
  "https://intelliresume.net/jobs/nursing/rn-medical-float-pool-cleveland-oh-22115744",
  "https://intelliresume.net/jobs/nursing/rn-special-care-nursery-canton-oh-22415924",
  "https://intelliresume.net/jobs/nursing/rn-emergency-department-avon-oh-22591108",
  "https://intelliresume.net/jobs/nursing/rn-cardiac-icu-cleveland-oh-22113895",
  "https://intelliresume.net/jobs/nursing/rn-operating-room-stuart-fl-22599510",
  "https://intelliresume.net/jobs/nursing/rn-euclid-oh-22169848",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-cardiovascular-telemetry-unit-cleveland-oh-22386431",
  "https://intelliresume.net/jobs/nursing/rn-dialysis-icu-mayfield-hts-oh-22537816",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-concierge-medicine-stuart-fl-22148096",
  "https://intelliresume.net/jobs/nursing/rn-nightingale-flex-prn-independence-oh-22113404",
  "https://intelliresume.net/jobs/nursing/rn-bu-float-pool-vero-beach-fl-22466599",
  "https://intelliresume.net/jobs/nursing/medical-emergency-team-nurse-vero-beach-fl-22359696",
  "https://intelliresume.net/jobs/nursing/surgical-clinician-cardiac-surgery-cleveland-oh-22499329",
  "https://intelliresume.net/jobs/nursing/rn-weekender-stepdown-float-days-cleveland-oh-22321759",
  "https://intelliresume.net/jobs/nursing/rn-surgery-resident-vascular-or-cleveland-oh-22260756",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-icu-euclid-oh-22126310",
  "https://intelliresume.net/jobs/nursing/advanced-practice-provider-aprn-pa-cns-emergency-d-akron-oh-22577016",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-icu-garfield-heights-oh-22511811",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-urology-gynecology-mayfield-hts-oh-22436642",
  "https://intelliresume.net/jobs/nursing/rn-homecare-float-weekender-flex-independence-oh-22450207",
  "https://intelliresume.net/jobs/nursing/rn-hospital-bu-4e-night-med-surg-vero-beach-fl-22160849",
  "https://intelliresume.net/jobs/nursing/rn-medical-surgical-unit-warrensville-hts-oh-22400934",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-med-surg-mayfield-hts-oh-22469966",
  "https://intelliresume.net/jobs/nursing/rn-general-surgery-med-surg-mayfield-hts-oh-22335949",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-women-s-health-cleveland-oh-22156483",
  "https://intelliresume.net/jobs/nursing/rn-care-coordinator-oncology-cleveland-oh-22547048",
  "https://intelliresume.net/jobs/nursing/rn-weekender-flex-surgery-mayfield-hts-oh-22504342",
  "https://intelliresume.net/jobs/nursing/rn-emergency-department-ed-vero-beach-fl-22113123",
  "https://intelliresume.net/jobs/nursing/rn-surgery-cardiac-surgery-cleveland-oh-22520914",
  "https://intelliresume.net/jobs/nursing/rn-rapid-response-team-mayfield-hts-oh-22115256",
  "https://intelliresume.net/jobs/nursing/rn-metabolic-disease-care-cleveland-oh-22538541",
  "https://intelliresume.net/jobs/nursing/rn-ob-dover-oh-22568799",
  "https://intelliresume.net/jobs/nursing/rn-intensive-care-unit-icu-canton-oh-22588986",
  "https://intelliresume.net/jobs/nursing/rn-dialysis-icu-warrensville-hts-oh-22591164",
  "https://intelliresume.net/jobs/nursing/rn-emergency-department-mentor-oh-22469795",
  "https://intelliresume.net/jobs/nursing/4s-rn-med-surg-days-part-time-vero-beach-fl-22316848",
  "https://intelliresume.net/jobs/nursing/rn-neuro-stroke-mayfield-hts-oh-22113028",
  "https://intelliresume.net/jobs/nursing/prn-rn-orthopedics-cleveland-oh-22395018",
  "https://intelliresume.net/jobs/nursing/rn-surgery-warrensville-hts-oh-22586296",
  "https://intelliresume.net/jobs/nursing/rn-labor-delivery-canton-oh-22415922",
  "https://intelliresume.net/jobs/nursing/rn-care-coordinator-orthopedics-cleveland-oh-22555392",
  "https://intelliresume.net/jobs/nursing/prn-rn-float-pool-akron-oh-22566078",
  "https://intelliresume.net/jobs/nursing/rn-bu-cardiac-stepdown-vero-beach-fl-22466609",
  "https://intelliresume.net/jobs/nursing/rn-icu-warrensville-hts-oh-22516021",
  "https://intelliresume.net/jobs/nursing/rn-emergency-department-ed-mayfield-hts-oh-22419881",
  "https://intelliresume.net/jobs/nursing/rn-cdu-full-time-days-vero-beach-fl-22437481",
  "https://intelliresume.net/jobs/nursing/rn-emergency-department-cleveland-oh-22525022",
  "https://intelliresume.net/jobs/nursing/rn-med-surg-mayfield-hts-oh-22109291",
  "https://intelliresume.net/jobs/nursing/rn-hospital-medina-oh-22268266",
  "https://intelliresume.net/jobs/nursing/nurse-practitioner-or-physician-assistant-inpatien-vero-beach-fl-22116360",
  "https://intelliresume.net/jobs/nursing/crna-hillcrest-hospital-sign-on-bonus-loan-repayme-mayfield-hts-oh-22583189",
  "https://intelliresume.net/jobs/nursing/rn-orthopedic-and-spine-cleveland-oh-22163217",
  "https://intelliresume.net/jobs/nursing/rn-code-blue-rapid-response-stuart-fl-22231726",
  "https://intelliresume.net/jobs/nursing/rn-bu-intermediate-cardiac-care-vero-beach-fl-22233521",
  "https://intelliresume.net/jobs/nursing/rn-medical-surgical-and-observation-warrensville-hts-oh-22136126",
  "https://intelliresume.net/jobs/nursing/research-nurse-coordinator-cleveland-oh-22390084",
  "https://intelliresume.net/jobs/nursing/rn-coronary-care-unit-mayfield-hts-oh-22516874",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-family-medicine-twinsburg-oh-22505507",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-team-lead-pediatrics-westlake-oh-22517327",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-telemetry-garfield-heights-oh-22148120",
  "https://intelliresume.net/jobs/nursing/prn-rn-medical-oncology-mayfield-hts-oh-22558110",
  "https://intelliresume.net/jobs/nursing/research-nurse-oncology-mayfield-hts-oh-22170117",
  "https://intelliresume.net/jobs/nursing/rn-special-labor-delivery-unit-cleveland-oh-22126070",
  "https://intelliresume.net/jobs/nursing/experienced-rn-neuroscience-icu-akron-oh-22505584",
  "https://intelliresume.net/jobs/nursing/rn-case-manager-western-cuyahoga-county-independence-oh-22360930",
  "https://intelliresume.net/jobs/nursing/rn-pediatrics-cleveland-oh-22553042",
  "https://intelliresume.net/jobs/nursing/rn-new-grad-orthopedic-and-spine-surgery-center-of-cleveland-oh-22531699",
  "https://intelliresume.net/jobs/nursing/certified-rn-anesthetist-crna-sign-on-bonus-loan-r-weston-fl-22113372",
  "https://intelliresume.net/jobs/nursing/rn-registered-nurse-cvor-vero-beach-fl-22151040",
  "https://intelliresume.net/jobs/nursing/rn-hospice-prn-evenings-independence-oh-22110839",
  "https://intelliresume.net/jobs/nursing/rn-observation-unit-warrensville-hts-oh-22161950",
  "https://intelliresume.net/jobs/nursing/rn-emergency-department-ed-weston-fl-22381760",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-icu-stepdown-canton-oh-22573863",
  "https://intelliresume.net/jobs/nursing/rn-inpatient-pediatric-rehab-cleveland-oh-22150892",
  "https://intelliresume.net/jobs/nursing/rn-epilepsy-monitoring-unit-akron-oh-22163408",
  "https://intelliresume.net/jobs/nursing/nurse-practitioner-physician-assistant-colorectal-port-saint-lucie-fl-22116351",
  "https://intelliresume.net/jobs/nursing/rn-cv-icu-vero-beach-fl-22155190",
  "https://intelliresume.net/jobs/nursing/rn-medical-telemetry-canton-oh-22558111",
  "https://intelliresume.net/jobs/nursing/rn-surgery-weekend-flex-cleveland-oh-22176975",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-euclid-oh-22439986",
  "https://intelliresume.net/jobs/nursing/certified-nurse-midwife-iii-mayfield-hts-oh-22142075",
  "https://intelliresume.net/jobs/nursing/nurse-practitioner-physician-assistant-or-clinical-strongsville-oh-22559376",
  "https://intelliresume.net/jobs/nursing/rn-coronary-care-unit-canton-oh-22250240",
  "https://intelliresume.net/jobs/nursing/rn-intensive-care-unit-icu-mayfield-hts-oh-22595458",
  "https://intelliresume.net/jobs/nursing/rn-emergency-department-ed-mayfield-hts-oh-22439647",
  "https://intelliresume.net/jobs/nursing/rn-medical-surgical-mayfield-hts-oh-22455570",
  "https://intelliresume.net/jobs/nursing/rn-hospital-resident-cardiology-stepdown-cleveland-oh-22112826",
  "https://intelliresume.net/jobs/nursing/rn-bu-orthopedics-vero-beach-fl-22424586",
  "https://intelliresume.net/jobs/nursing/rn-cardiac-cath-lab-intraop-weston-fl-22333015",
  "https://intelliresume.net/jobs/nursing/nurse-practitioner-physician-assistant-general-sur-stuart-fl-22226756",
  "https://intelliresume.net/jobs/nursing/assistant-nurse-manager-endoscopy-mayfield-hts-oh-22268111",
  "https://intelliresume.net/jobs/nursing/rn-ent-plastics-and-internal-medicine-unit-cleveland-oh-22135154",
  "https://intelliresume.net/jobs/nursing/rn-bu-behavioral-health-center-vero-beach-fl-22434402",
  "https://intelliresume.net/jobs/nursing/nurse-practitioner-physician-assistant-hospital-me-stuart-fl-22599408",
  "https://intelliresume.net/jobs/nursing/coordinator-critical-care-transport-rn-beachwood-oh-22115114",
  "https://intelliresume.net/jobs/nursing/advanced-practice-provider-emergency-np-pa-emergen-canton-oh-22147462",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-general-medicine-geriatric-me-mayfield-hts-oh-22115906",
  "https://intelliresume.net/jobs/nursing/nursing-admission-specialist-home-care-east-team-independence-oh-22148154",
  "https://intelliresume.net/jobs/nursing/hematology-oncology-advanced-practice-provider-apr-cleveland-oh-22524199",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-team-lead-hematology-oncology-beachwood-oh-22431962",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-team-lead-internal-medicine-cleveland-oh-22552771",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-medical-surgical-cleveland-oh-22117491",
  "https://intelliresume.net/jobs/nursing/rn-medical-intensive-care-unit-micu-cleveland-oh-22228315",
  "https://intelliresume.net/jobs/nursing/rn-surgery-vascular-weekender-flex-cleveland-oh-22480133",
  "https://intelliresume.net/jobs/nursing/rn-resident-orthopaedic-and-spine-cleveland-oh-22281000",
  "https://intelliresume.net/jobs/nursing/assistant-nurse-manager-acute-care-cardiology-and-akron-oh-22467950",
  "https://intelliresume.net/jobs/nursing/rn-med-surg-mayfield-hts-oh-22459495",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-med-surg-chest-pain-mayfield-hts-oh-22108019",
  "https://intelliresume.net/jobs/nursing/rn-bu-labor-and-delivery-vero-beach-fl-22383237",
  "https://intelliresume.net/jobs/nursing/rn-postpartum-mother-baby-unit-cleveland-oh-22573511",
  "https://intelliresume.net/jobs/nursing/rn-care-coordinator-brain-tumor-center-cleveland-oh-22487889",
  "https://intelliresume.net/jobs/nursing/rn-specialist-i-wound-ostomy-continence-akron-oh-22572018",
  "https://intelliresume.net/jobs/nursing/rn-med-surg-general-surgery-mayfield-hts-oh-22333752",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-med-surg-and-orthopaedics-medina-oh-22381326",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-uro-gyn-akron-oh-22494425",
  "https://intelliresume.net/jobs/nursing/advanced-practice-provider-aprn-pa-cns-rapid-obser-akron-oh-22577017",
  "https://intelliresume.net/jobs/nursing/rn-postpartum-mother-baby-unit-cleveland-oh-22599215",
  "https://intelliresume.net/jobs/nursing/rn-cardiothoracic-surgery-stepdown-cleveland-oh-22113456",
  "https://intelliresume.net/jobs/nursing/rn-emergency-department-7pm-1pm-variable-start-akron-oh-22398420",
  "https://intelliresume.net/jobs/nursing/nurse-practitioner-acute-care-physician-assistant-port-saint-lucie-fl-22121582",
  "https://intelliresume.net/jobs/nursing/rn-weekender-bone-marrow-transplant-cleveland-oh-22107863",
  "https://intelliresume.net/jobs/nursing/rn-emergency-department-ed-garfield-heights-oh-22548596",
  "https://intelliresume.net/jobs/nursing/rn-resident-cardiology-stepdown-unit-cleveland-oh-22110624",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-neurological-specialty-unit-cleveland-oh-22113336",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-hematology-oncology-cleveland-oh-22149040",
  "https://intelliresume.net/jobs/nursing/rn-specialist-cardiac-catheter-pod-akron-oh-22497377",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-childrens-rehab-cleveland-oh-22506513",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-garfield-heights-oh-22406082",
  "https://intelliresume.net/jobs/nursing/rn-med-surg-and-telemetry-cleveland-oh-22439774",
  "https://intelliresume.net/jobs/nursing/prn-rn-emergency-department-weston-fl-22466957",
  "https://intelliresume.net/jobs/nursing/rn-emergency-department-cleveland-oh-22500878",
  "https://intelliresume.net/jobs/nursing/assistant-nurse-manager-euclid-oh-22126291",
  "https://intelliresume.net/jobs/nursing/rn-geriatric-psych-cleveland-oh-22148233",
  "https://intelliresume.net/jobs/nursing/rn-ambulatory-head-and-neck-specialty-cleveland-oh-22113712",
  "https://intelliresume.net/jobs/nursing/new-grad-rn-resident-med-surg-mayfield-hts-oh-22417366",
  "https://intelliresume.net/resume-builder",
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
