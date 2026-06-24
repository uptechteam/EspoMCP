/**
 * Property-based tests for rate limiter sliding window invariant.
 *
 * **Validates: Requirements 8.1, 8.2, 8.4**
 *
 * Property 7: For any sequence of N request timestamps dispatched through
 * the rate limiter with a configured limit L, there SHALL be no 60-second
 * window containing more than L dispatched requests, and all N requests
 * SHALL eventually complete (none rejected).
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Standalone rate limiter simulation
// ---------------------------------------------------------------------------
// We replicate the exact sliding-window logic from EspoCRMClient's request
// interceptor so we can test the invariant without Axios or real HTTP calls.
//
// Key modelling decision: in the real implementation, `Date.now()` is used
// for the current time, which is always monotonically non-decreasing. Our
// simulation tracks a `clock` that advances to at least the arrival time of
// each request (arrivals are sorted chronologically) and may advance further
// when the limiter imposes a delay.
// ---------------------------------------------------------------------------

interface RateLimiterState {
  timestamps: number[];
  limit: number;
  windowMs: number;
}

/**
 * Simulate dispatching a request through the rate limiter.
 *
 * `clock` represents the current wall-clock time. It must be >= the
 * previous call's returned clock (monotonic). The request "arrives" at
 * `arrivalTime`, but the effective `now` is `max(clock, arrivalTime)` to
 * model the fact that the limiter can only process the next request after
 * the previous one has been dispatched (including any delay).
 *
 * Returns `[dispatchedAt, newClock]`.
 */
function simulateRequest(
  state: RateLimiterState,
  arrivalTime: number,
  clock: number,
): [number, number] {
  // The effective "now" is the later of the arrival time and the current clock
  let now = Math.max(arrivalTime, clock);

  // Prune timestamps older than the window
  state.timestamps = state.timestamps.filter(
    (t) => now - t < state.windowMs,
  );

  // If at limit, calculate delay until oldest timestamp exits the window
  if (state.timestamps.length >= state.limit) {
    const oldestTimestamp = state.timestamps[0];
    const delay = state.windowMs - (now - oldestTimestamp);
    if (delay > 0 && delay <= state.windowMs) {
      now = now + delay; // simulate waiting
      // Re-prune after delay
      state.timestamps = state.timestamps.filter(
        (t) => now - t < state.windowMs,
      );
    }
  }

  // Record this request
  state.timestamps.push(now);
  return [now, now];
}

/**
 * Check the sliding window invariant: for every possible 60-second window
 * anchored at any dispatched timestamp, the count of dispatched timestamps
 * within [t, t + windowMs) must not exceed the limit.
 */
function checkSlidingWindowInvariant(
  dispatchedTimestamps: number[],
  limit: number,
  windowMs: number,
): boolean {
  const sorted = [...dispatchedTimestamps].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    const windowStart = sorted[i];
    const windowEnd = windowStart + windowMs;
    const countInWindow = sorted.filter(
      (t) => t >= windowStart && t < windowEnd,
    ).length;
    if (countInWindow > limit) {
      return false;
    }
  }
  return true;
}

// --- Generators ---

/** Rate limit between 1 and 20 (kept small for fast test execution) */
const rateLimitArb = fc.integer({ min: 1, max: 20 });

/**
 * Generate a sorted sequence of request arrival times.
 * Times are non-negative offsets in ms from an arbitrary epoch.
 * We keep the total time span reasonable (0–180 000 ms = 3 minutes)
 * so the sliding window logic is exercised meaningfully.
 */
const sortedRequestTimesArb = (count: number) =>
  fc
    .array(fc.integer({ min: 0, max: 180_000 }), {
      minLength: count,
      maxLength: count,
    })
    .map((arr) => [...arr].sort((a, b) => a - b));

/** Number of requests to simulate (between 1 and 50) */
const requestCountArb = fc.integer({ min: 1, max: 50 });

// --- Property 7 ---

describe('Property 7: Rate limiter sliding window invariant', () => {
  const NUM_RUNS = 100;
  const WINDOW_MS = 60_000;

  /**
   * **Validates: Requirements 8.1, 8.4**
   *
   * For any sequence of N request timestamps and a configured limit L,
   * the dispatched timestamps SHALL never have more than L requests
   * in any 60-second window.
   */
  it('no 60-second window contains more than L dispatched requests', () => {
    fc.assert(
      fc.property(
        rateLimitArb,
        requestCountArb.chain((count) =>
          sortedRequestTimesArb(count).map((times) => ({ count, times })),
        ),
        (limit, { count, times }) => {
          const state: RateLimiterState = {
            timestamps: [],
            limit,
            windowMs: WINDOW_MS,
          };

          let clock = 0;
          const dispatched: number[] = [];

          for (const arrival of times) {
            const [dispatchedAt, newClock] = simulateRequest(
              state,
              arrival,
              clock,
            );
            clock = newClock;
            dispatched.push(dispatchedAt);
          }

          expect(
            checkSlidingWindowInvariant(dispatched, limit, WINDOW_MS),
          ).toBe(true);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * **Validates: Requirements 8.2**
   *
   * All N requests SHALL eventually complete — none are rejected.
   * The rate limiter delays but never drops requests.
   */
  it('all requests eventually complete (none rejected)', () => {
    fc.assert(
      fc.property(
        rateLimitArb,
        requestCountArb.chain((count) =>
          sortedRequestTimesArb(count).map((times) => ({ count, times })),
        ),
        (limit, { count, times }) => {
          const state: RateLimiterState = {
            timestamps: [],
            limit,
            windowMs: WINDOW_MS,
          };

          let clock = 0;
          const dispatched: number[] = [];

          for (const arrival of times) {
            const [dispatchedAt, newClock] = simulateRequest(
              state,
              arrival,
              clock,
            );
            clock = newClock;
            dispatched.push(dispatchedAt);
          }

          // Every request must produce a dispatched timestamp
          expect(dispatched.length).toBe(count);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * **Validates: Requirements 8.1**
   *
   * When requests arrive faster than the limit allows within a single
   * window, the dispatched timestamps must be spread out so that the
   * window invariant holds. Specifically, if we send 2×limit requests
   * all at time 0, the first `limit` dispatch at 0 and the rest are
   * delayed to at or beyond the window boundary.
   */
  it('burst exceeding limit causes delays that respect the window', () => {
    fc.assert(
      fc.property(rateLimitArb, (limit) => {
        const state: RateLimiterState = {
          timestamps: [],
          limit,
          windowMs: WINDOW_MS,
        };

        const totalRequests = limit * 2;
        let clock = 0;
        const dispatched: number[] = [];

        for (let i = 0; i < totalRequests; i++) {
          const [dispatchedAt, newClock] = simulateRequest(state, 0, clock);
          clock = newClock;
          dispatched.push(dispatchedAt);
        }

        // All requests completed
        expect(dispatched.length).toBe(totalRequests);

        // Sliding window invariant holds
        expect(
          checkSlidingWindowInvariant(dispatched, limit, WINDOW_MS),
        ).toBe(true);

        // The first `limit` requests should be at time 0,
        // the rest must be delayed to at or beyond the window boundary
        const firstBatch = dispatched.slice(0, limit);
        const secondBatch = dispatched.slice(limit);

        for (const t of firstBatch) {
          expect(t).toBe(0);
        }
        for (const t of secondBatch) {
          expect(t).toBeGreaterThanOrEqual(WINDOW_MS);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * **Validates: Requirements 8.1**
   *
   * With a limit of 1, every request must be spaced at least windowMs
   * apart in dispatched time (except the very first one).
   */
  it('limit=1 spaces every request by at least windowMs', () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.integer({ min: 0, max: 180_000 }), {
            minLength: 2,
            maxLength: 10,
          })
          .map((arr) => [...arr].sort((a, b) => a - b)),
        (arrivalTimes) => {
          const state: RateLimiterState = {
            timestamps: [],
            limit: 1,
            windowMs: WINDOW_MS,
          };

          let clock = 0;
          const dispatched: number[] = [];

          for (const arrival of arrivalTimes) {
            const [dispatchedAt, newClock] = simulateRequest(
              state,
              arrival,
              clock,
            );
            clock = newClock;
            dispatched.push(dispatchedAt);
          }

          // Each consecutive pair must be at least windowMs apart
          for (let i = 1; i < dispatched.length; i++) {
            expect(dispatched[i] - dispatched[i - 1]).toBeGreaterThanOrEqual(
              WINDOW_MS,
            );
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
