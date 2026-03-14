import { beforeEach, describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ThemeToggle } from "@/components/theme-toggle"
import { ThemeProvider } from "@/components/theme-provider"

function renderThemeToggle(defaultTheme: "dark" | "light" = "light") {
  return render(
    <ThemeProvider defaultTheme={defaultTheme}>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    // Clear cookies between tests to prevent state leaking
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/"
    })
  })

  it("renders with aria-label mentioning the opposite theme", () => {
    renderThemeToggle("light")
    expect(screen.getByLabelText(/switch to dark mode/i)).toBeInTheDocument()
  })

  it("shows dark-mode label when theme is dark", () => {
    renderThemeToggle("dark")
    expect(screen.getByLabelText(/switch to light mode/i)).toBeInTheDocument()
  })

  it("toggles the aria-label on click", async () => {
    renderThemeToggle("light")
    const btn = screen.getByLabelText(/switch to dark mode/i)
    await userEvent.click(btn)
    expect(btn).toHaveAttribute("aria-label", expect.stringMatching(/switch to light mode/i))
  })
})
