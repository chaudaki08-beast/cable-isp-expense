"use client"

import { useActionState } from "react"

import { login, type LoginState } from "./actions"
import { LogoMark } from "@/components/brand/logo"
import { APP_NAME } from "@/lib/constants"

const initialState: LoginState = { error: null }

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <div className="auth-card">
      <div className="brand">
        <LogoMark className="mx-auto size-12" />
        <h1>{APP_NAME}</h1>
        <p className="t-muted">Track your daily income &amp; expenses</p>
      </div>

      <form action={formAction} className="auth-form">
        <label className="field">
          <span>Email</span>
          <input
            className="t-input"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>
        <label className="field" style={{ marginTop: 12 }}>
          <span>Password</span>
          <input
            className="t-input"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </label>

        {state.error ? (
          <p className="auth-error" role="alert">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          className="btn btn-primary btn-block"
          style={{ marginTop: 16 }}
          disabled={pending}
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  )
}
