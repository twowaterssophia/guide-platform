import { Injectable } from '@nestjs/common'

type ProviderMode = 'demo' | 'sandbox' | 'production'

function parseProviderMode(value: string | undefined): ProviderMode {
  if (value === 'sandbox' || value === 'production') return value
  return 'demo'
}

@Injectable()
export class RuntimeService {
  getInfo() {
    return {
      identityProvider: parseProviderMode(process.env.IDENTITY_PROVIDER),
      skillProvider: parseProviderMode(process.env.SKILL_PROVIDER),
    }
  }
}
