import React from 'react'

interface VideoEmbedProps {
  videoId: string
  className?: string
}

export function VideoEmbed({ videoId, className = '' }: VideoEmbedProps) {
  return (
    <div className={`aspect-w-4 aspect-h-3 rounded-lg overflow-hidden shadow-2xl ${className}`}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autohide=1&showinfo=0&controls=1`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      ></iframe>
    </div>
  )
}