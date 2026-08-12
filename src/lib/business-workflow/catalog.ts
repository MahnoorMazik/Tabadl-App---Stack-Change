/**
 * Tabadl Alkon business workflow catalog — sourced from Business Workflow PDF (07072026).
 * 27 essential services, 3 packages, 4-phase payment structure, profile document requirements.
 */

export const PAYMENT_PHASES = [
  {
    phaseNumber: 1,
    name: 'Advance Payment',
    description: 'Advance upon receiving confirmation of registration from the company',
    percentage: 30,
  },
  {
    phaseNumber: 2,
    name: 'Second Payment',
    description: 'Second instalment during processing',
    percentage: 30,
  },
  {
    phaseNumber: 3,
    name: 'Completion Payment',
    description: 'Payment upon completion of services',
    percentage: 25,
  },
  {
    phaseNumber: 4,
    name: 'Final Release Payment',
    description: 'Final payment before releasing documents',
    percentage: 15,
  },
] as const

export const SERVICE_CATEGORIES = [
  { slug: 'company-formation', name: 'Company Formation', sortOrder: 1 },
  { slug: 'government-registrations', name: 'Government Registrations', sortOrder: 2 },
  { slug: 'visa-hr-setup', name: 'Visa & HR Setup', sortOrder: 3 },
  { slug: 'core-value', name: 'Additional Core Value', sortOrder: 4 },
] as const

export const BUSINESS_SERVICES = [
  // Company Formation (1-7)
  { slug: 'trade-name-reservation', name: 'Trade Name Reservation', category: 'company-formation', sortOrder: 1 },
  { slug: 'misa-investment-license', name: 'MISA Investment License', category: 'company-formation', sortOrder: 2 },
  { slug: 'articles-of-association', name: 'Articles of Association', category: 'company-formation', sortOrder: 3 },
  { slug: 'commercial-registration', name: 'Commercial Registration (CR)', category: 'company-formation', sortOrder: 4 },
  { slug: 'company-seal', name: 'Company Seal', category: 'company-formation', sortOrder: 5 },
  { slug: 'national-address', name: 'National Address Registration', category: 'company-formation', sortOrder: 6 },
  { slug: 'saudi-post-spl', name: 'Saudi Post (SPL)', category: 'company-formation', sortOrder: 7 },
  // Government Registrations (8-14)
  { slug: 'chamber-of-commerce', name: 'Chamber of Commerce Registration', category: 'government-registrations', sortOrder: 8 },
  { slug: 'zatca-registration', name: 'ZATCA Registration', category: 'government-registrations', sortOrder: 9 },
  { slug: 'gosi-registration', name: 'GOSI Registration', category: 'government-registrations', sortOrder: 10 },
  { slug: 'qiwa-registration', name: 'QIWA Registration', category: 'government-registrations', sortOrder: 11 },
  { slug: 'muqeem-registration', name: 'MUQEEM Registration', category: 'government-registrations', sortOrder: 12 },
  { slug: 'mudad-registration', name: 'MUDAD Registration', category: 'government-registrations', sortOrder: 13 },
  { slug: 'absher-registration', name: 'ABSHER Registration', category: 'government-registrations', sortOrder: 14 },
  // Visa & HR Setup (15-20)
  { slug: 'gm-visa-issuance', name: 'GM Visa Issuance', category: 'visa-hr-setup', sortOrder: 15 },
  { slug: 'gm-iqama-processing', name: 'GM Iqama Processing', category: 'visa-hr-setup', sortOrder: 16 },
  { slug: 'medical-test-assistance', name: 'Medical Test Assistance', category: 'visa-hr-setup', sortOrder: 17 },
  { slug: 'work-permit-processing', name: 'Work Permit Processing', category: 'visa-hr-setup', sortOrder: 18 },
  { slug: 'health-insurance-setup', name: 'Health Insurance Setup', category: 'visa-hr-setup', sortOrder: 19 },
  { slug: 'corporate-bank-account', name: 'Corporate Bank Account Assistance', category: 'visa-hr-setup', sortOrder: 20 },
  // Core value propositions (21-27)
  { slug: 'foreign-ownership', name: '100% Foreign Ownership Processing', category: 'core-value', sortOrder: 21 },
  { slug: 'fast-company-formation', name: 'Fast Company Formation Management', category: 'core-value', sortOrder: 22 },
  { slug: 'complete-gov-processing', name: 'Complete Government Processing', category: 'core-value', sortOrder: 23 },
  { slug: 'entry-visa-coordination', name: 'Entry Visa Coordination', category: 'core-value', sortOrder: 24 },
  { slug: 'medical-processing-admin', name: 'Medical Processing Administration', category: 'core-value', sortOrder: 25 },
  { slug: 'work-permit-setup', name: 'Work Permit Operational Setup', category: 'core-value', sortOrder: 26 },
  { slug: 'iqama-processing-mgmt', name: 'IQAMA Processing Management', category: 'core-value', sortOrder: 27 },
] as const

/** Package tiers — Professional matches PDF reference pricing (USD 5,000 / SAR 18,750) */
export const SERVICE_PACKAGES = [
  {
    slug: 'starter',
    name: 'Starter Package',
    description: 'Essential company formation services for new businesses entering Saudi Arabia.',
    basePriceUsd: 3500,
    basePriceSar: 13125,
    sortOrder: 1,
    serviceSlugs: BUSINESS_SERVICES.filter((s) => s.sortOrder <= 7).map((s) => s.slug),
  },
  {
    slug: 'professional',
    name: 'Professional Package',
    description: 'Complete formation plus government registrations — our most popular package.',
    basePriceUsd: 5000,
    basePriceSar: 18750,
    sortOrder: 2,
    isFeatured: true,
    serviceSlugs: BUSINESS_SERVICES.filter((s) => s.sortOrder <= 20).map((s) => s.slug),
  },
  {
    slug: 'enterprise',
    name: 'Enterprise Package',
    description: 'All 27 essential business services with full processing and management.',
    basePriceUsd: 6500,
    basePriceSar: 24375,
    sortOrder: 3,
    serviceSlugs: BUSINESS_SERVICES.map((s) => s.slug),
  },
] as const

export const ADDITIONAL_SERVICES = [
  {
    slug: 'extra-visa-processing',
    name: 'Additional Visa Processing',
    description: 'Extra visa processing beyond package allocation',
    priceUsd: 500,
    priceSar: 1875,
    linkedService: 'gm-visa-issuance',
  },
  {
    slug: 'premium-bank-account',
    name: 'Premium Bank Account Setup',
    description: 'Expedited corporate bank account assistance',
    priceUsd: 750,
    priceSar: 2813,
    linkedService: 'corporate-bank-account',
  },
  {
    slug: 'document-translation',
    name: 'Certified Document Translation',
    description: 'Official translation of company documents',
    priceUsd: 200,
    priceSar: 750,
    linkedService: 'document-translation',
  },
  {
    slug: 'annual-compliance',
    name: 'Annual Compliance Support',
    description: 'Ongoing compliance and renewal management',
    priceUsd: 1200,
    priceSar: 4500,
    linkedService: 'annual-compliance'
  },
] as const

export const PROFILE_REQUIREMENTS = [
  {
    code: 'PASSPORT',
    name: 'Passport',
    description: 'Valid passport copy (bio page)',
    inputType: 'DOCUMENT' as const,
    isRequired: true,
    sortOrder: 1,
  },
  {
    code: 'CONTACT_NUMBER',
    name: 'Contact Number',
    description: 'Primary contact phone number',
    inputType: 'CONTACT_FIELD' as const,
    isRequired: true,
    sortOrder: 2,
  },
  {
    code: 'COMPANY_DOCUMENTS',
    name: 'Company Documents',
    description: 'General company documentation bundle',
    inputType: 'DOCUMENT' as const,
    isRequired: true,
    sortOrder: 3,
  },
  {
    code: 'COMMERCIAL_REGISTRATION',
    name: 'Commercial Registration (CR)',
    description: 'Company Registration certificate if already registered',
    inputType: 'DOCUMENT' as const,
    isRequired: false,
    sortOrder: 4,
  },
  {
    code: 'ARTICLES_OF_ASSOCIATION',
    name: 'Articles of Association (AOA)',
    description: 'Including all amendments if any',
    inputType: 'DOCUMENT' as const,
    isRequired: true,
    sortOrder: 5,
  },
  {
    code: 'MEMORANDUM_OF_ASSOCIATION',
    name: 'Memorandum of Association (MOA)',
    description: 'Signed memorandum of association',
    inputType: 'DOCUMENT' as const,
    isRequired: true,
    sortOrder: 6,
  },
] as const

export function calculatePhaseAmounts(totalSar: number) {
  return PAYMENT_PHASES.map((phase) => ({
    ...phase,
    amountSar: Math.round((totalSar * phase.percentage) / 100 * 100) / 100,
    amountUsd: Math.round((totalSar * phase.percentage) / 100 / 3.75 * 100) / 100,
  }))
}
