import { BookOpen } from 'lucide-react'

export function KnowledgeBasesPage() {
  return (
    <section className="page-section" aria-labelledby="knowledge-bases-title">
      <div className="page-heading"><h1 id="knowledge-bases-title">知识库</h1></div>
      <div className="guide-empty">
        <div className="guide-empty-icon" aria-hidden="true"><BookOpen size={48} strokeWidth={1.3} /></div>
        <h2 className="guide-empty-title">知识库管理暂未开放</h2>
      </div>
    </section>
  )
}
