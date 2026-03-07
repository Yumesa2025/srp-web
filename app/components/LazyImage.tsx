"use client";

import { useState, useEffect, useRef } from "react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

export default function LazyImage({ src, alt, className, ...props }: LazyImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const currentRef = imgRef.current;
    
    // Intersection Observer API를 통해 뷰포트 노출 감지
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // 이미지가 로드되면 관찰 해제
        }
      },
      { rootMargin: "150px" } // 화면에 나타나기 150px 전부터 로드 시작
    );

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={isVisible ? src : "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="} // 투명 플레이스홀더
      alt={alt}
      loading="lazy" // 브라우저 네이티브 lazy 로딩도 병행 적용
      className={`transition-opacity duration-300 ease-in-out ${isVisible ? "opacity-100" : "opacity-0"} ${className || ""}`}
      {...props}
    />
  );
}
