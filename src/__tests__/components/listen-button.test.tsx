import { describe, it, expect, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ListenButton } from "@/components/listen-button"
import { renderWithContext } from "../helpers/render-with-context"

describe("ListenButton", () => {
  it("renders 'Start Listening' when not listening", () => {
    renderWithContext(<ListenButton />)
    expect(screen.getByRole("button", { name: /start listening/i })).toBeInTheDocument()
  })

  it("renders 'Stop Listening' when listening", () => {
    renderWithContext(<ListenButton />, {
      contextOverrides: { isListening: true },
    })
    expect(screen.getByRole("button", { name: /stop listening/i })).toBeInTheDocument()
  })

  it("uses destructive variant when listening", () => {
    const { container } = renderWithContext(<ListenButton />, {
      contextOverrides: { isListening: true },
    })
    const btn = container.querySelector("button")!
    // shadcn destructive variant adds a recognizable class
    expect(btn.className).toMatch(/destructive/)
  })

  it("calls toggleListening on click", async () => {
    const toggleListening = vi.fn()
    renderWithContext(<ListenButton />, {
      contextOverrides: { toggleListening },
    })
    await userEvent.click(screen.getByRole("button", { name: /start listening/i }))
    expect(toggleListening).toHaveBeenCalledOnce()
  })
})
