import { useQuery } from '@tanstack/react-query'
import { runtimeInfoSchema } from '@guide/contracts'
import { getJson } from '../api/client'

export function RuntimePage() {
  const runtimeQuery = useQuery({
    queryKey: ['runtime'],
    queryFn: async () => runtimeInfoSchema.parse(await getJson('/runtime')),
  })
  const runtime = runtimeQuery.data
  return (
    <section className="page-section" aria-labelledby="runtime-title">
      <div className="page-heading"><h1 id="runtime-title">运行环境</h1></div>
      <div className="state-panel">{runtime ? `身份服务：${runtime.identityProvider}；技能服务：${runtime.skillProvider}` : '正在读取运行环境'}</div>
    </section>
  )
}
