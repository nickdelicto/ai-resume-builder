import React from 'react'

interface VideoEmbedProps {
  videoId: string
  className?: string
}

export function VideoEmbed({ videoId, className = '' }: VideoEmbedProps) {
  return (
    <div className={`relative w-full overflow-hidden rounded-lg shadow-2xl ${className}`} style={{ paddingBottom: '50%' }}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autohide=1&showinfo=0&controls=1`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute top-0 left-0 w-full h-full"
      ></iframe>
    </div>
  )
}