"use client";

import { useEffect, useRef, useState } from "react";

export const viewportOnce = { once: true, amount: 0.25 };

export const stagger = {
  fast: 90,
  medium: 140,
};

export const fadeUp = {
  initial: "opacity-0 translate-y-4",
  inView: "opacity-100 translate-y-0",
  transition: "transition-all duration-700 ease-out",
};

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: viewportOnce.amount }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`${fadeUp.transition} ${visible ? fadeUp.inView : fadeUp.initial} ${className}`}
    >
      {children}
    </div>
  );
}
