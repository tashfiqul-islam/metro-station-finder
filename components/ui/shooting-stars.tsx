"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

type ShootingStar = {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  angle: number;
  scale: number;
  speed: number;
  delay: number;
};

// Animation constants
const STAR_COUNT = 8;
const SIDE_COUNT = 4;
const RANDOM_50 = 50;
const RANDOM_40 = 40;
const RANDOM_60 = 60;
const RANDOM_30 = 30;
const RANDOM_110 = 110;
const RANDOM_8 = 8;
const DEGREES_180 = 180;
const DEGREES_PER_RADIAN = DEGREES_180 / Math.PI;
const OFFSET_NEGATIVE_10 = -10;
const SCALE_BASE = 0.6;
const SCALE_RANGE = 0.4;
const SPEED_BASE = 1.2;
const SPEED_RANGE = 0.8;

const DURATION_MULTIPLIER = 1.5;
const REPEAT_DELAY_BASE = 4;
const REPEAT_DELAY_RANGE = 6;

const EASE_BEZIER_P1 = 0.25;
const EASE_BEZIER_P2 = 0.1;
const EASE_BEZIER_P3 = 0.25;
const EASE_BEZIER_P4 = 1;
const EASE_BEZIER = [
  EASE_BEZIER_P1,
  EASE_BEZIER_P2,
  EASE_BEZIER_P3,
  EASE_BEZIER_P4,
] as const;

const TIMES_ANIMATION_START = 0;
const TIMES_ANIMATION_MID1 = 0.1;
const TIMES_ANIMATION_MID2 = 0.9;
const TIMES_ANIMATION_END = 1;
const TIMES_ANIMATION = [
  TIMES_ANIMATION_START,
  TIMES_ANIMATION_MID1,
  TIMES_ANIMATION_MID2,
  TIMES_ANIMATION_END,
];

const generateStarFromSide = (side: number): ShootingStar => {
  const random = Math.random;
  let startX: number, startY: number, endX: number, endY: number, angle: number;

  switch (side) {
    case 0: {
      startX = random() * RANDOM_50;
      startY = OFFSET_NEGATIVE_10;
      endX = startX + RANDOM_30 + random() * RANDOM_40;
      endY = RANDOM_50 + random() * RANDOM_60;
      break;
    }
    case 1: {
      startX = RANDOM_110;
      startY = random() * RANDOM_50;
      endX = RANDOM_30 + random() * RANDOM_50;
      endY = startY + RANDOM_30 + random() * RANDOM_40;
      break;
    }
    case 2: {
      startX = RANDOM_50 + random() * RANDOM_50;
      startY = OFFSET_NEGATIVE_10;
      endX = startX - RANDOM_30 - random() * RANDOM_40;
      endY = RANDOM_50 + random() * RANDOM_60;
      break;
    }
    default: {
      startX = OFFSET_NEGATIVE_10;
      startY = random() * RANDOM_50;
      endX = RANDOM_30 + random() * RANDOM_50;
      endY = startY + RANDOM_30 + random() * RANDOM_40;
      break;
    }
  }

  angle = Math.atan2(endY - startY, endX - startX) * DEGREES_PER_RADIAN;

  return {
    id: Math.random(),
    startX,
    startY,
    endX,
    endY,
    angle,
    scale: SCALE_BASE + random() * SCALE_RANGE,
    speed: SPEED_BASE + random() * SPEED_RANGE,
    delay: random() * RANDOM_8,
  };
};

export function ShootingStars() {
  const [stars, setStars] = useState<ShootingStar[]>([]);

  useEffect(() => {
    const generateStars = () => {
      const newStars: ShootingStar[] = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        const side = Math.floor(Math.random() * SIDE_COUNT);
        newStars.push(generateStarFromSide(side));
      }
      setStars(newStars);
    };

    generateStars();
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((star) => (
        <motion.div
          animate={{
            opacity: [0, 1, 1, 0],
            x: `${(star.endX - star.startX) * 10}px`,
            y: `${(star.endY - star.startY) * 10}px`,
          }}
          className="absolute"
          initial={{
            opacity: 0,
            x: 0,
            y: 0,
          }}
          key={star.id}
          style={{
            left: `${star.startX}%`,
            top: `${star.startY}%`,
          }}
          transition={{
            duration: DURATION_MULTIPLIER / star.speed,
            delay: star.delay,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: REPEAT_DELAY_BASE + Math.random() * REPEAT_DELAY_RANGE,
            ease: EASE_BEZIER,
            times: TIMES_ANIMATION,
          }}
        >
          <div
            className="relative"
            style={{
              transform: `rotate(${star.angle}deg) scale(${star.scale})`,
            }}
          >
            <div
              className="h-[3px] w-[120px] bg-gradient-to-r from-transparent to-transparent blur-[2px]"
              style={{
                background:
                  "linear-gradient(to right, transparent, rgb(var(--shooting-star-color)), transparent)",
              }}
            />
            <div className="absolute top-0 h-[2px] w-[120px] bg-gradient-to-r from-transparent via-white to-transparent" />
            <div
              className="absolute top-[-3px] right-0 h-3 w-3 rounded-full bg-gradient-to-br from-white shadow-lg blur-[1px]"
              style={{
                background:
                  "linear-gradient(to bottom right, white, rgb(var(--shooting-star-color)))",
                boxShadow: "0 0 8px rgb(var(--shooting-star-color) / 0.3)",
              }}
            />
            <div className="absolute top-[-1px] right-[2px] h-1.5 w-1.5 rounded-full bg-white" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
