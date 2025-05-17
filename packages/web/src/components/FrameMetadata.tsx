'use client'

type FrameMetadataProps = {
  title: string
  image: string
  buttonText?: string
  postUrl?: string
}

export function FrameMetadata({ title, image, buttonText = 'Bid', postUrl }: FrameMetadataProps) {
  return (
    <>
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content={image} />
      <meta property="fc:frame:button:1" content={buttonText} />
      {postUrl && (
        <meta 
          property="fc:frame:post_url" 
          content={postUrl} 
        />
      )}
      <meta 
        property="og:image" 
        content={image} 
      />
      <meta 
        property="og:title" 
        content={title} 
      />
    </>
  )
}
