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
    coverImage: `https://picsum.photos/800/400?random=${id}`,
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
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <img
              src={drop.coverImage}
              alt={drop.title}
              className="w-full h-auto rounded-lg mb-6"
            />
            
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-white">{drop.title}</h1>
              <p className="text-gray-400">By {drop.artist}</p>
              
              <div className="bg-gray-900 p-4 rounded-lg">
                <p className="text-sm text-gray-400">Current Bid</p>
                <p className="text-2xl font-bold text-white">{drop.highestBid} ETH</p>
              </div>

              <div className="bg-gray-900 p-4 rounded-lg">
                <p className="text-sm text-gray-400">Auction Ends</p>
                <p className="text-2xl font-bold text-white">
                  {new Date(drop.endTime).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
