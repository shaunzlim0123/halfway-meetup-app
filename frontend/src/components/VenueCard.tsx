"use client";

import { VenueData } from "@/lib/types";

interface VenueCardProps {
  venue: VenueData;
  isSelected: boolean;
  onSelect: (venueId: string) => void;
  disabled: boolean;
  isWinner?: boolean;
}

function parseTags(json: string | null): string[] {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function parseJSON<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function getPriceLevelDisplay(level: string | null): string {
  switch (level) {
    case "PRICE_LEVEL_INEXPENSIVE":
      return "$";
    case "PRICE_LEVEL_MODERATE":
      return "$$";
    case "PRICE_LEVEL_EXPENSIVE":
      return "$$$";
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "$$$$";
    default:
      return "";
  }
}

export default function VenueCard({
  venue,
  isSelected,
  onSelect,
  disabled,
  isWinner,
}: VenueCardProps) {
  const cuisineTags = parseTags(venue.cuisineTags);
  const vibeTags = parseTags(venue.vibeTags);
  const bestFor = parseTags(venue.bestFor);
  const priceDisplay = getPriceLevelDisplay(venue.priceLevel);

  // Parse review data
  const reviewSentiment = parseJSON<{positive: number, neutral: number, negative: number}>(
    venue.reviewSentiment,
    {positive: 0, neutral: 0, negative: 0}
  );
  const standoutDishes = parseJSON<string[]>(venue.standoutDishes, []);
  const reviewHighlights = parseJSON<string[]>(venue.reviewHighlights, []);
  const sentimentScore = reviewSentiment.positive;

  return (
    <div
      onClick={() => !disabled && onSelect(venue.id)}
      className={`
        relative rounded-xl border-2 p-5 transition-all cursor-pointer
        ${isWinner ? "border-saffron bg-saffron/10 ring-2 ring-saffron/30" : ""}
        ${isSelected && !isWinner ? "border-mint bg-mint/10 ring-2 ring-mint/30" : ""}
        ${!isSelected && !isWinner ? "border-border bg-card hover:border-border hover:bg-card-hover" : ""}
        ${disabled ? "cursor-default" : "hover:shadow-lg hover:shadow-black/20"}
      `}
    >
      {isWinner && (
        <div className="absolute -top-3 -right-3 bg-saffron text-deep text-xs font-bold px-3 py-1 rounded-full">
          WINNER
        </div>
      )}

      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-text-primary">{venue.name}</h3>
        <div className="flex items-center gap-2 text-sm shrink-0 ml-2">
          <span className="text-saffron font-medium">
            {venue.rating.toFixed(1)} ★
          </span>
          <span className="text-text-muted">
            ({venue.userRatingCount.toLocaleString()})
          </span>
          {priceDisplay && (
            <span className="text-mint font-medium">{priceDisplay}</span>
          )}
        </div>
      </div>

      {/* Sentiment Badge */}
      {sentimentScore > 0 && (
        <span className={`text-xs px-2 py-0.5 rounded-full inline-block mb-2 ${
          sentimentScore > 0.6 ? 'bg-mint/20 text-mint' :
          sentimentScore > 0.4 ? 'bg-yellow-500/20 text-yellow-600' :
          'bg-red-500/20 text-red-600'
        }`}>
          {sentimentScore > 0.6 ? '😊 Loved by diners' :
           sentimentScore > 0.4 ? '😐 Mixed reviews' :
           '😕 Some concerns'}
        </span>
      )}

      {venue.description && (
        <p className="text-sm text-text-secondary mb-3">{venue.description}</p>
      )}

      {/* Review Summary */}
      {venue.reviewSummary && (
        <div className="mb-3 p-3 bg-mint/5 rounded-lg border border-mint/20">
          <p className="text-xs font-semibold text-mint mb-1">
            💬 What Diners Say:
          </p>
          <p className="text-sm text-text-secondary italic">
            &quot;{venue.reviewSummary}&quot;
          </p>
        </div>
      )}

      {/* Standout Dishes from Reviews */}
      {standoutDishes.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-text-muted mb-1">
            🍽️ Must-Try Dishes (from reviews):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {standoutDishes.map((dish) => (
              <span key={dish} className="px-2 py-1 bg-saffron/20 text-saffron text-sm rounded-md font-medium">
                {dish}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Fallback: AI-generated signature dish if no reviews */}
      {standoutDishes.length === 0 && venue.signatureDish && (
        <p className="text-sm text-saffron-dim mb-3">
          <span className="font-medium">Likely known for:</span>{" "}
          {venue.signatureDish}
        </p>
      )}

      {cuisineTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {cuisineTags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-saffron/15 text-saffron text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {vibeTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {vibeTags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-mint/15 text-mint text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Review Highlights */}
      {reviewHighlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {reviewHighlights.map((highlight) => (
            <span key={highlight} className="px-2 py-0.5 bg-purple-500/15 text-purple-600 text-xs rounded-full">
              ✨ {highlight}
            </span>
          ))}
        </div>
      )}

      {bestFor.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {bestFor.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-text-muted/15 text-text-secondary text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {venue.address && (
        <p className="text-xs text-text-muted mt-2">{venue.address}</p>
      )}

      {venue.googleMapsUri && (
        <a
          href={venue.googleMapsUri}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-saffron hover:underline mt-1 inline-block"
        >
          Open in Google Maps
        </a>
      )}
    </div>
  );
}
