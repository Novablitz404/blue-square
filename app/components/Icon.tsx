"use client";

type IconProps = {
  name: "activity" | "points" | "trophy" | "medal-gold" | "medal-silver" | "medal-bronze" | "refresh" | "check" | "plus" | "arrow-right" | "arrow-left" | "arrow-inbound" | "arrow-outbound" | "wallet" | "transaction" | "nft" | "contract";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Icon({ name, size = "md", className = "" }: IconProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const icons = {
    activity: (
      <svg className={`${sizeClasses[size]} ${className}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
        <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
      </svg>
    ),
    points: (
      <svg className={`${sizeClasses[size]} ${className}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ),
    trophy: (
      <svg className={`${sizeClasses[size]} ${className}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.64a1 1 0 01.894 1.79l-1.233.493 1.414 1.414a1 1 0 01-1.414 1.414L15.5 9.207l-.5.5v4.793a1 1 0 01-1 1H6a1 1 0 01-1-1V9.707l-.5-.5-1.414 1.414a1 1 0 01-1.414-1.414l1.414-1.414-1.233-.493a1 1 0 01.894-1.79l1.599.64L9 3.323V3a1 1 0 011-1z" />
      </svg>
    ),
    "medal-gold": (
      <img 
        src="/1st-prize.png" 
        alt="1st Prize" 
        className={`${sizeClasses[size]} ${className}`}
      />
    ),
    "medal-silver": (
      <img 
        src="/2nd-place.png" 
        alt="2nd Place" 
        className={`${sizeClasses[size]} ${className}`}
      />
    ),
    "medal-bronze": (
      <img 
        src="/3rd-place.png" 
        alt="3rd Place" 
        className={`${sizeClasses[size]} ${className}`}
      />
    ),
    refresh: (
      <svg className={`${sizeClasses[size]} ${className}`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
      </svg>
    ),
    check: (
      <svg className={`${sizeClasses[size]} ${className}`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ),
    plus: (
      <svg className={`${sizeClasses[size]} ${className}`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
      </svg>
    ),
    "arrow-right": (
      <svg className={`${sizeClasses[size]} ${className}`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    ),
    "arrow-left": (
      <svg className={`${sizeClasses[size]} ${className}`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
      </svg>
    ),
    "arrow-inbound": (
      <span className={`${sizeClasses[size]} ${className} font-bold`}>↓</span>
    ),
    "arrow-outbound": (
      <span className={`${sizeClasses[size]} ${className} font-bold`}>↑</span>
    ),
    wallet: (
      <svg className={`${sizeClasses[size]} ${className}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
      </svg>
    ),
    transaction: (
      <svg className={`${sizeClasses[size]} ${className}`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    ),
    nft: (
      <svg className={`${sizeClasses[size]} ${className}`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
      </svg>
    ),
    contract: (
      <svg className={`${sizeClasses[size]} ${className}`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    ),
  };

  return icons[name] || null;
} 