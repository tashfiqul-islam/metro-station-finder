import { describe, expect, it } from "vitest";

import { STATIONS } from "@/data/stations";
import { InvalidStationError, calculateFare } from "@/features/fare-calculator/logic";

describe("calculateFare", () => {
  it("returns 0 for same-station trips", () => {
    expect(calculateFare("uttara-north", "uttara-north")).toBe(0);
    expect(calculateFare("motijheel", "motijheel")).toBe(0);
    expect(calculateFare("shahbagh", "shahbagh")).toBe(0);
  });

  it("is symmetric — fare(a,b) === fare(b,a)", () => {
    const pairs = STATIONS.flatMap((s, i) =>
      STATIONS.slice(i + 1).map((t) => [s.slug, t.slug] as const),
    );
    for (const [a, b] of pairs) {
      expect(calculateFare(a, b), `fare(${a}, ${b})`).toBe(calculateFare(b, a));
    }
  });

  describe("DMTCL spot-check fares (BDT)", () => {
    it("Uttara North → Uttara Center: 20", () => {
      expect(calculateFare("uttara-north", "uttara-center")).toBe(20);
    });
    it("Uttara North → Pallabi: 40", () => {
      expect(calculateFare("uttara-north", "pallabi")).toBe(40);
    });
    it("Uttara North → Mirpur 10: 50", () => {
      expect(calculateFare("uttara-north", "mirpur-10")).toBe(50);
    });
    it("Uttara North → Agargaon: 70", () => {
      expect(calculateFare("uttara-north", "agargaon")).toBe(70);
    });
    it("Uttara North → Motijheel: 100", () => {
      expect(calculateFare("uttara-north", "motijheel")).toBe(100);
    });
    it("Mirpur 10 → Shahbagh: 50", () => {
      expect(calculateFare("mirpur-10", "shahbagh")).toBe(50);
    });
    it("Agargaon → Bangladesh Secretariat: 50", () => {
      expect(calculateFare("agargaon", "bangladesh-secretariat")).toBe(50);
    });
    it("Farmgate → Motijheel: 40", () => {
      expect(calculateFare("farmgate", "motijheel")).toBe(40);
    });
    it("Shahbagh → Motijheel: 30", () => {
      expect(calculateFare("shahbagh", "motijheel")).toBe(30);
    });
    it("Motijheel → Kamalapur: 20", () => {
      expect(calculateFare("motijheel", "kamalapur")).toBe(20);
    });
    it("Uttara North → Kamalapur: 100", () => {
      expect(calculateFare("uttara-north", "kamalapur")).toBe(100);
    });
  });

  describe("InvalidStationError", () => {
    it("throws for unknown origin slug", () => {
      expect(() => calculateFare("not-a-station", "motijheel")).toThrow(InvalidStationError);
    });

    it("throws for unknown destination slug", () => {
      expect(() => calculateFare("shahbagh", "nonexistent")).toThrow(InvalidStationError);
    });

    it("throws for both unknown slugs", () => {
      expect(() => calculateFare("foo", "bar")).toThrow(InvalidStationError);
    });

    it("error message contains the unknown slug", () => {
      expect(() => calculateFare("ghost-station", "shahbagh")).toThrow("ghost-station");
    });
  });
});
