import { describe, it, expect } from "vitest"
import { screen } from "@testing-library/react"
import { StatsCard } from "@/components/monitoring-cards"
import { renderWithContext } from "../helpers/render-with-context"

describe("StatsCard", () => {
  it("displays the formatted speed", () => {
    renderWithContext(<StatsCard />, {
      contextOverrides: { displayRate: 1.5 },
    })
    expect(screen.getByText("1.50×")).toBeInTheDocument()
  })

  it("displays 1.00× at default rate", () => {
    renderWithContext(<StatsCard />)
    expect(screen.getByText("1.00×")).toBeInTheDocument()
  })

  it("displays the energy percentage", () => {
    renderWithContext(<StatsCard />, {
      contextOverrides: { energy: 0.42 },
    })
    expect(screen.getByText("42")).toBeInTheDocument()
  })

  it("clamps energy bar width at 100%", () => {
    const { container } = renderWithContext(<StatsCard />, {
      contextOverrides: { energy: 1 },
    })
    // energy * 300 = 300, clamped to 100
    const bar = container.querySelector("[style]") as HTMLElement
    expect(bar.style.width).toBe("100%")
  })

  it("scales energy bar proportionally", () => {
    const { container } = renderWithContext(<StatsCard />, {
      contextOverrides: { energy: 0.1 },
    })
    // energy * 300 = 30%
    const bar = container.querySelector("[style]") as HTMLElement
    expect(bar.style.width).toBe("30%")
  })

  it("shows 0 energy when energy is 0", () => {
    const { container } = renderWithContext(<StatsCard />, {
      contextOverrides: { energy: 0 },
    })
    // The energy bar should have 0% width
    const bar = container.querySelector("[style]") as HTMLElement
    expect(bar.style.width).toBe("0%")
  })
})
