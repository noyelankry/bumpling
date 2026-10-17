// Bump a version string whenever that document's text changes materially —
// consent_logs rows record which version a user accepted, so re-prompting
// after a real policy change depends on these being kept current.
export const TERMS_VERSION = '1.0'
export const PRIVACY_VERSION = '1.0'
export const HEALTH_CONSENT_VERSION = '1.0'

export type ConsentDocument = 'terms' | 'privacy' | 'health_data' | 'age_attestation'
