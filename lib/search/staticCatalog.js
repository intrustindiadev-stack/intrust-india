// No nfc_* or solar_* catalog tables exist in the schema; closest available alternative per HARD RULE 7.

export const STATIC_CATALOG = Object.freeze([
  {
    id: 'static-nfc-001',
    name: 'NFC Smart Card',
    category: 'nfc',
    price: null,
    thumbnail: '/logo.png',
    url: '/nfc-service',
    description: 'Tap-to-share digital business card with contactless NFC technology',
    searchTokens: ['nfc', 'smart card', 'tap', 'contactless', 'digital card', 'business card']
  },
  {
    id: 'static-solar-001',
    name: 'Solar Power Plan',
    category: 'solar',
    price: null,
    thumbnail: '/solar-home.png',
    url: '/solar',
    description: 'Rooftop solar panel installation with government subsidy assistance',
    searchTokens: ['solar', 'rooftop', 'panel', 'energy', 'power plan', 'subsidy', 'installation']
  }
]);
