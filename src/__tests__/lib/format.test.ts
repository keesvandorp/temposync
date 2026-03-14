import { describe, it, expect } from "vitest"
import { formatTime } from "@/lib/format"

describe("formatTime", () => {
  it("formats 0 seconds", () => {
    expect(formatTime(0)).toBe("0:00")
  })

  it("formats seconds < 60", () => {
    expect(formatTime(5)).toBe("0:05")
    expect(formatTime(30)).toBe("0:30")
    expect(formatTime(59)).toBe("0:59")
  })

  it("formats exact minutes", () => {
    expect(formatTime(60)).toBe("1:00")
    expect(formatTime(120)).toBe("2:00")
  })

  it("formats minutes and seconds", () => {
    expect(formatTime(90)).toBe("1:30")
    expect(formatTime(125)).toBe("2:05")
    expect(formatTime(3661)).toBe("61:01")
  })

  it("floors fractional seconds", () => {
    expect(formatTime(90.7)).toBe("1:30")
    expect(formatTime(0.9)).toBe("0:00")
  })

  it("pads single-digit seconds", () => {
    expect(formatTime(61)).toBe("1:01")
    expect(formatTime(69)).toBe("1:09")
  })
})
