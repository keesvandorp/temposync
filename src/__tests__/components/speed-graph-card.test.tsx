import { describe, it, expect } from "vitest"
import { screen } from "@testing-library/react"
import { SpeedGraphCard } from "@/components/monitoring-cards"
import { renderWithContext } from "../helpers/render-with-context"

describe("SpeedGraphCard", () => {
  it("renders a canvas element", () => {
    const { container } = renderWithContext(<SpeedGraphCard />)
    expect(container.querySelector("canvas")).toBeInTheDocument()
  })

  it("renders the title", () => {
    renderWithContext(<SpeedGraphCard />)
    expect(screen.getAllByText("Playback Speed").length).toBeGreaterThanOrEqual(1)
  })
})
