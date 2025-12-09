"use client";

import { useMemo, useRef, useState } from "react";
import { extent } from "d3-array";
import { geoAlbersUsa, geoDistance, geoPath } from "d3-geo";
import { scaleQuantize } from "d3-scale";
import type { Feature, FeatureCollection, Geometry, MultiLineString } from "geojson";
import { feature, mesh } from "topojson-client";
import type { Topology } from "topojson-specification";
import states from "us-atlas/states-10m.json" assert { type: "json" };

import {
  foodWasteByFips,
  foodWasteData,
  nationalTotals,
  topWasteStates,
} from "@/data/foodWaste";
import type { FoodWasteDatum } from "@/data/foodWaste";

import styles from "./page.module.css";

const EARTH_RADIUS_MILES = 3958.8;
const SVG_WIDTH = 960;
const SVG_HEIGHT = 600;

const formatMillions = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0M";
  }
  const millions = value / 1_000_000;
  if (millions >= 10) {
    return `${millions.toFixed(0)}M`;
  }
  if (millions >= 1) {
    return `${millions.toFixed(1)}M`;
  }
  return `${millions.toFixed(2)}M`;
};

const formatLegendValue = (value?: number) => `${formatMillions(value)} tons`;

const nationalTotalLabel = formatLegendValue(nationalTotals.annualTons);

const statesTopology = states as unknown as Topology;

const statesFeatureCollection = feature(
  statesTopology,
  statesTopology.objects.states,
) as FeatureCollection<Geometry, { name: string }>;

const stateFeatures = statesFeatureCollection.features as Feature<
  Geometry,
  { name: string }
>[];

const borders = mesh(
  statesTopology,
  statesTopology.objects.states as any,
  (a, b) => a !== b,
) as MultiLineString;

const projection = geoAlbersUsa().scale(1200).translate([SVG_WIDTH / 2, SVG_HEIGHT / 2]);
const pathGenerator = geoPath(projection);

const wasteValues = foodWasteData.map((item) => item.annualTons);
const [minValue, maxValue] = extent(wasteValues) as [number, number];

const colorScale = scaleQuantize<string>()
  .domain([minValue, maxValue])
  .range(["#fff5eb", "#fdc074", "#f7944d", "#e2542e", "#99201b"]);

const legendItems = colorScale.range().map((color) => {
  const [from, to] = colorScale.invertExtent(color);
  return {
    color,
    label: `${formatLegendValue(from)} – ${formatLegendValue(to)}`,
  };
});

const scaleStart: [number, number] = [-105, 31];
const scaleEnd: [number, number] = [-92, 31];
const projectedStart = projection(scaleStart);
const projectedEnd = projection(scaleEnd);
const rawMiles = geoDistance(scaleStart, scaleEnd) * EARTH_RADIUS_MILES;
const scaleMiles = Math.round(rawMiles / 10) * 10;
const scaleFillPercent =
  projectedStart && projectedEnd
    ? Math.min(100, Math.max(10, (Math.abs(projectedEnd[0] - projectedStart[0]) / SVG_WIDTH) * 100))
    : 35;

const formattedHouseholds = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
}).format(nationalTotals.householdsImpacted);

const producedOn = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
}).format(new Date());

type HoveredState = {
  stats: FoodWasteDatum;
  x: number;
  y: number;
};

type HighlightedStateInsight = {
  code: string;
  reason: string;
};

type ExplorationResult = {
  summary: string;
  criteria: string;
  highlightedStates: HighlightedStateInsight[];
  suggestedNextQuestions: string[];
};

const samplePrompts = [
  "Highlight states wasting more than 5 million tons",
  "Show me which regions could feed the most households",
  "Compare the Northeast to the West Coast",
];

export default function Home() {
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);
  const [hoveredState, setHoveredState] = useState<HoveredState | null>(null);
  const [exploreQuery, setExploreQuery] = useState("");
  const [explorationResult, setExplorationResult] = useState<ExplorationResult | null>(null);
  const [highlightedStateCodes, setHighlightedStateCodes] = useState<string[]>([]);
  const [exploreError, setExploreError] = useState<string | null>(null);
  const [isExploring, setIsExploring] = useState(false);

  const highlightedStateSet = useMemo(
    () => new Set(highlightedStateCodes),
    [highlightedStateCodes],
  );
  const hasHighlights = highlightedStateCodes.length > 0;

  const handlePointerMove = (
    event: React.PointerEvent<SVGPathElement>,
    stats: FoodWasteDatum,
  ) => {
    if (!mapWrapperRef.current) return;
    const wrapperBounds = mapWrapperRef.current.getBoundingClientRect();
    const offsetX = event.clientX - wrapperBounds.left;
    const offsetY = event.clientY - wrapperBounds.top;
    const padding = 16;
    const clampedX = Math.min(
      Math.max(offsetX, padding),
      wrapperBounds.width - padding,
    );
    const clampedY = Math.min(
      Math.max(offsetY, padding),
      wrapperBounds.height - padding,
    );
    setHoveredState({
      stats,
      x: clampedX,
      y: clampedY,
    });
  };

  const performExploration = async (query: string) => {
    if (!query.trim()) {
      setExploreError("Ask a question about the map to explore insights.");
      return;
    }

    setIsExploring(true);
    setExploreError(null);
    try {
      const response = await fetch("/api/explore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = (await response.json()) as
        | ExplorationResult
        | { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(
          ("error" in data && data.error) ||
            ("message" in data && data.message) ||
            "Unable to explore that request.",
        );
      }

      const typed = data as ExplorationResult;
      setExplorationResult(typed);
      setHighlightedStateCodes(typed.highlightedStates.map((state) => state.code));
    } catch (error) {
      console.error(error);
      setExplorationResult(null);
      setHighlightedStateCodes([]);
      setExploreError(
        error instanceof Error ? error.message : "Sorry, I couldn't interpret that request.",
      );
    } finally {
      setIsExploring(false);
    }
  };

  const handleExplorationSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    performExploration(exploreQuery);
  };

  const handleSamplePrompt = (prompt: string) => {
    setExploreQuery(prompt);
    performExploration(prompt);
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.overlayLeft}>
          <section className={styles.hero}>
            <div>
              <p className={styles.kicker}>United States · 2023</p>
              <h1 className={styles.title}>Surplus Food Destined for Waste</h1>
              <p className={styles.description}>
                Applying a national ReFED per-person surplus estimate (407 lbs/year) to the latest
                state population counts reveals how much edible food never reaches people. The
                darker the shade, the more annual waste each state generates.
              </p>
            </div>
            <div className={styles.stats}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{nationalTotalLabel}</span>
                <span className={styles.statLabel}>Total wasted food</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {nationalTotals.perPersonWasteLbs.toLocaleString()} lbs
                </span>
                <span className={styles.statLabel}>Per person annually</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{formattedHouseholds}</span>
                <span className={styles.statLabel}>Households impacted</span>
              </div>
            </div>
          </section>

          <div className={styles.legendCard}>
            <header className={styles.legendHeader}>
              <h2>Annual surplus food headed to waste (million tons)</h2>
              <p>Albers USA projection · derived from 2023 population + ReFED per-person waste</p>
            </header>
            <div className={styles.legend}>
              <span className={styles.legendTitle}>Legend · Annual surplus food</span>
              <div className={styles.legendScale}>
                {legendItems.map((item) => (
                  <span key={item.color} className={styles.legendItem}>
                    <span className={styles.swatch} style={{ backgroundColor: item.color }} />
                    <span>{item.label}</span>
                  </span>
                ))}
              </div>
            </div>
            <p className={styles.dataNotes}>
              Methodology: Multiply 2023 Census state population estimates by ReFED&apos;s 2023
              national surplus average (407 lbs/person). Convert to tons and divide by 2.6 people
              per household (ACS) to describe how many families could be fed if recovery systems
              scaled.
            </p>
          </div>

          <section className={styles.explorationCard}>
            <div>
              <h3>Explore with AI</h3>
              <p className={styles.explorationDescription}>
                Ask a natural-language question to focus the map on specific states, thresholds, or
                regions.
              </p>
            </div>
            <form className={styles.explorationForm} onSubmit={handleExplorationSubmit}>
              <input
                type="text"
                name="explore"
                placeholder="e.g., Highlight states with the highest waste per person"
                value={exploreQuery}
                onChange={(event) => setExploreQuery(event.target.value)}
                disabled={isExploring}
                aria-label="Exploration prompt"
              />
              <button type="submit" disabled={isExploring}>
                {isExploring ? "Thinking…" : "Ask AI"}
              </button>
            </form>
            <div className={styles.samplePromptList}>
              {samplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSamplePrompt(prompt)}
                  disabled={isExploring}
                >
                  {prompt}
                </button>
              ))}
            </div>
            {exploreError && <p className={styles.errorText}>{exploreError}</p>}
            {explorationResult && (
              <div className={styles.explorationResult} aria-live="polite">
                <p className={styles.explorationCriteria}>{explorationResult.criteria}</p>
                <p>{explorationResult.summary}</p>
                {explorationResult.highlightedStates.length > 0 && (
                  <ul className={styles.highlightList}>
                    {explorationResult.highlightedStates.map((state) => (
                      <li key={state.code}>
                        <strong>{state.code}</strong> — {state.reason}
                      </li>
                    ))}
                  </ul>
                )}
                {explorationResult.suggestedNextQuestions?.length > 0 && (
                  <div className={styles.nextQuestions}>
                    <span>Try next:</span>
                    <div>
                      {explorationResult.suggestedNextQuestions.map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => handleSamplePrompt(question)}
                          disabled={isExploring}
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <div className={styles.mapWrapper} ref={mapWrapperRef}>
          <svg
            className={styles.mapSvg}
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            role="img"
            aria-label="Choropleth map of U.S. food waste by state"
            onPointerLeave={() => setHoveredState(null)}
          >
            <title>U.S. Food Waste Map</title>
            <desc>
              Each state is colored using five bins that represent total annual surplus food (in
              million tons) based on 2023 population estimates.
            </desc>
            {stateFeatures.map((feature) => {
              const stats = foodWasteByFips.get(String(feature.id));
              const fill = stats ? colorScale(stats.annualTons) : "#d9dce3";
              const d = pathGenerator(feature);
              if (!d) return null;
              const isHighlighted = Boolean(stats && highlightedStateSet.has(stats.code));
              const className = [
                styles.statePath,
                isHighlighted ? styles.stateHighlighted : "",
                hasHighlights && !isHighlighted ? styles.stateMuted : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <path
                  key={feature.id as string}
                  d={d}
                  className={className}
                  fill={fill}
                  stroke="#f5f6fa"
                  strokeWidth={isHighlighted ? 1.2 : 0.6}
                  onPointerMove={(event) => stats && handlePointerMove(event, stats)}
                  onPointerLeave={() => setHoveredState(null)}
                >
                  {stats && (
                    <title>
                      {`${stats.name}: ${formatLegendValue(stats.annualTons)} · ${stats.population.toLocaleString()} residents`}
                    </title>
                  )}
                </path>
              );
            })}
            {borders && (
              <path
                d={pathGenerator(borders) ?? undefined}
                fill="none"
                stroke="#1a202c"
                strokeWidth={0.4}
                opacity={0.4}
              />
            )}
          </svg>
          {hoveredState && (
            <div
              className={styles.tooltip}
              style={{
                left: hoveredState.x,
                top: hoveredState.y,
              }}
            >
              <span className={styles.tooltipState}>{hoveredState.stats.name}</span>
              <span className={styles.tooltipMetric}>
                Waste · {formatLegendValue(hoveredState.stats.annualTons)}
              </span>
              <span className={styles.tooltipDetail}>
                {hoveredState.stats.population.toLocaleString()} residents
              </span>
              <span className={styles.tooltipDetail}>
                {Math.round(hoveredState.stats.householdsImpacted).toLocaleString()} households
                impacted
              </span>
            </div>
          )}

          <div className={styles.northArrow}>
            North
            <svg width="26" height="42" viewBox="0 0 26 42" aria-hidden="true">
              <polygon points="13,0 0,18 8,18 8,42 18,42 18,18 26,18" fill="#1f2937" />
            </svg>
          </div>

          <div className={styles.scaleBar}>
            <div className={styles.scaleTrack}>
              <div className={styles.scaleFill} style={{ width: `${scaleFillPercent}%` }} />
            </div>
            <div className={styles.scaleLabel}>≈ {scaleMiles.toLocaleString()} miles</div>
          </div>
        </div>

        <aside className={`${styles.infoPanel} ${styles.overlayRight}`}>
          <div>
            <h3>States generating the most surplus</h3>
            <div className={styles.topStates}>
              {topWasteStates.map((state, index) => (
                <div key={state.code} className={styles.topStateRow}>
                  <span>
                    {index + 1}. {state.name}
                  </span>
                  <span>{formatLegendValue(state.annualTons)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.sources}>
            <strong>Data sources</strong>
            <p>
              U.S. Census Bureau, 2023 Vintage state population estimates; ReFED Insights Engine
              (2023) national per-capita surplus; American Community Survey 2023 average household
              size.
            </p>
          </div>

          <div className={styles.author}>
            <strong>Author</strong>
            <p>
              Alan Estrada · Prepared {producedOn}. Projection: Albers USA. Use File &gt; Print to
              export to PDF for submission.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
