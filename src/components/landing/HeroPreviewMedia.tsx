import React, { useState } from 'react';
import { useReducedMotion } from 'motion/react';
import HeroDashboardMock from './HeroDashboardMock';

const VIDEO_SRC = '/hero-loop.mp4';
const POSTER_SRC = '/hero-loop-poster.jpg';

export default function HeroPreviewMedia() {
  const reduceMotion = useReducedMotion();
  const [videoFailed, setVideoFailed] = useState(false);
  const showVideo = !reduceMotion && !videoFailed;

  return (
    <div className="relative w-full">
      {showVideo ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-[6px] border border-surface-border bg-black">
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={POSTER_SRC}
            aria-label="Abstract animated preview of the Oweable dashboard"
            onError={() => setVideoFailed(true)}
          >
            <source src={VIDEO_SRC} type="video/mp4" />
          </video>
        </div>
      ) : (
        <HeroDashboardMock />
      )}
    </div>
  );
}
