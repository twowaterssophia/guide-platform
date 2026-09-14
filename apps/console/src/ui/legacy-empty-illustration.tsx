type LegacyEmptyIllustrationKind = 'map' | 'persona' | 'plugin' | 'tour'

interface LegacyEmptyIllustrationProps {
  kind: LegacyEmptyIllustrationKind
}

export function LegacyEmptyIllustration({ kind }: LegacyEmptyIllustrationProps) {
  if (kind === 'persona') {
    return <svg className="legacy-empty-illustration legacy-empty-illustration-persona" viewBox="0 0 96 72" aria-hidden="true" focusable="false"><path d="M18 36h10l7-16v32l7-16h10l7-9v18l7-9h12" /><circle cx="18" cy="36" r="3" /><circle cx="78" cy="36" r="3" /></svg>
  }

  if (kind === 'map') {
    return <svg className="legacy-empty-illustration legacy-empty-illustration-map" viewBox="0 0 96 72" aria-hidden="true" focusable="false"><rect x="8" y="10" width="80" height="52" rx="3" /><path d="m8 25 20-8 20 8 20-8 20 8M8 49l20-8 20 8 20-8 20 8M28 17v24M48 25v24M68 17v24" /><circle cx="48" cy="37" r="5" /><path d="M48 32v-5" /></svg>
  }

  if (kind === 'tour') {
    return <svg className="legacy-empty-illustration legacy-empty-illustration-tour" viewBox="0 0 96 72" aria-hidden="true" focusable="false"><path d="M16 54C24 39 31 45 39 31S55 17 64 29s10 20 17 10" /><circle cx="16" cy="54" r="5" /><circle cx="43" cy="26" r="5" /><circle cx="81" cy="39" r="5" /><path d="M43 21V10M43 10h14l-4 5 4 5H43" /></svg>
  }

  return <svg className="legacy-empty-illustration legacy-empty-illustration-plugin" viewBox="0 0 96 72" aria-hidden="true" focusable="false"><path d="M37 18v12M59 18v12M30 30h36v13a13 13 0 0 1-13 13h-2v8H45v-8h-2a13 13 0 0 1-13-13V30ZM37 18h22M66 36h10a6 6 0 0 1 0 12H66" /></svg>
}
