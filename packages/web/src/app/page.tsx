import { HeroAuction } from '@/components/HeroAuction'
import { PastDrops } from '@/components/PastDrops'
import { UpcomingDrops } from '@/components/UpcomingDrops'

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8 space-y-16">
      <HeroAuction />
      
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Upcoming Drops</h2>
          <a href="/drops" className="text-blue-400 hover:text-blue-300 transition-colors">
            View all
          </a>
        </div>
        <UpcomingDrops />
      </section>

      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Past Drops</h2>
          <a href="/archive" className="text-blue-400 hover:text-blue-300 transition-colors">
            View archive
          </a>
        </div>
        <PastDrops />
      </section>
    </main>
  )
}
