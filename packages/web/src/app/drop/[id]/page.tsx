import { FrameMetadata } from '@/components/FrameMetadata'
import { Metadata } from 'next'

type Props = {
  params: { id: string }
}

// This would come from your database/subgraph
async function getDropData(id: string) {
  return {
    id,
    title: `Track #${id}`,
    artist: '0x1234...',
    coverImage: `https://picsum.photos/300/300?random=${id}`,
    highestBid: '0.5',
    endTime: new Date(Date.now() + 3600000).toISOString(),
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const drop = await getDropData(params.id)
  
  return {
    title: `${drop.title} by ${drop.artist} | ZoundZ`,
    description: `Bid on ${drop.title} by ${drop.artist} on ZoundZ`,
    openGraph: {
      title: `${drop.title} by ${drop.artist}`,
      description: `Current bid: ${drop.highestBid} ETH`,
      images: [{ url: drop.coverImage }],
    },
  }
}

export default async function DropPage({ params }: Props) {
  const drop = await getDropData(params.id)
  const postUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/frame/${params.id}/bid`

  return (
    <>
      <FrameMetadata
        title={`${drop.title} by ${drop.artist}`}
        image={drop.coverImage}
        buttons={[{ text: '💫 Place Bid' }]}
        postUrl={postUrl}
        aspectRatio="1:1"
        description={`Current bid: ${drop.highestBid} ETH`}
      />

      <main className="min-h-screen bg-black">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="max-w-2xl mx-auto">
            <div className="max-w-md mx-auto rounded-lg overflow-hidden shadow-xl mb-4 sm:mb-6">
              <div className="aspect-w-1 aspect-h-1 max-h-[300px]">
                <img
                  src={drop.coverImage}
                  alt={drop.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">{drop.title}</h1>
                <p className="text-sm sm:text-base text-gray-400">By {drop.artist}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900 p-3 rounded-lg">
                  <p className="text-xs text-gray-400">Current Bid</p>
                  <p className="text-lg sm:text-xl font-bold text-white">{drop.highestBid} ETH</p>
                </div>

                <div className="bg-gray-900 p-3 rounded-lg">
                  <p className="text-xs text-gray-400">Auction Ends</p>
                  <p className="text-lg sm:text-xl font-bold text-white">
                    {new Date(drop.endTime).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
