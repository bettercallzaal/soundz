'use client'

type Button = {
  text: string
  action?: 'post' | 'link'
  target?: string
}

type AspectRatio = '1.91:1' | '1:1'

type FrameMetadataProps = {
  title: string
  image: string
  buttons?: Button[]
  postUrl?: string
  inputText?: string
  description?: string
  aspectRatio?: AspectRatio
}

export function FrameMetadata({ 
  title, 
  image, 
  buttons = [{ text: 'Bid' }],
  postUrl,
  inputText,
  description,
  aspectRatio = '1.91:1'
}: FrameMetadataProps) {
  // Calculate image dimensions based on aspect ratio
  const dimensions = {
    '1.91:1': { width: 1146, height: 600 },
    '1:1': { width: 800, height: 800 }
  }[aspectRatio]

  // Add dimensions to image URL if it doesn't already have them
  const imageUrl = new URL(image)
  if (!imageUrl.searchParams.has('w') && !imageUrl.searchParams.has('h')) {
    imageUrl.searchParams.set('w', dimensions.width.toString())
    imageUrl.searchParams.set('h', dimensions.height.toString())
  }

  return (
    <>
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content={imageUrl.toString()} />
      <meta property="fc:frame:image:aspect_ratio" content={aspectRatio} />
      
      {/* Buttons - Max 4 buttons for mobile */}
      {buttons.slice(0, 4).map((button, index) => (
        <meta 
          key={`button-${index + 1}`}
          property={`fc:frame:button:${index + 1}`} 
          content={button.text}
        />
      ))}

      {/* Button Actions */}
      {buttons.slice(0, 4).map((button, index) => {
        if (button.action === 'link' && button.target) {
          return (
            <meta
              key={`action-${index + 1}`}
              property={`fc:frame:button:${index + 1}:action`}
              content="link"
            />
          )
        }
        return null
      })}

      {/* Button Targets */}
      {buttons.slice(0, 4).map((button, index) => {
        if (button.target) {
          return (
            <meta
              key={`target-${index + 1}`}
              property={`fc:frame:button:${index + 1}:target`}
              content={button.target}
            />
          )
        }
        return null
      })}

      {/* Post URL */}
      {postUrl && (
        <meta 
          property="fc:frame:post_url" 
          content={postUrl} 
        />
      )}

      {/* Input Text - Keep it short for mobile */}
      {inputText && (
        <meta 
          property="fc:frame:input:text" 
          content={inputText.length > 50 ? inputText.slice(0, 47) + '...' : inputText} 
        />
      )}

      {/* Open Graph */}
      <meta 
        property="og:image" 
        content={imageUrl.toString()} 
      />
      <meta 
        property="og:title" 
        content={title.length > 70 ? title.slice(0, 67) + '...' : title} 
      />
      {description && (
        <meta 
          property="og:description" 
          content={description.length > 200 ? description.slice(0, 197) + '...' : description} 
        />
      )}
    </>
  )
}
