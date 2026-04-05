"use client"

import { Suspense, useActionState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { signInAction, type AuthState } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { FileText, ArrowRight } from "lucide-react"

const initialState: AuthState = {}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, formAction, isPending] = useActionState(signInAction, initialState)

  useEffect(() => {
    if (state.success) {
      router.push(state.redirectTo || "/dashboard")
      return
    }

    if (!state.success && state.redirectTo) {
      router.push(state.redirectTo)
    }
  }, [state.success, state.redirectTo, router])

  const isRegistered = searchParams.get("registered") === "true"
  const isVerified = searchParams.get("verified") === "true"

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary-foreground rounded-lg">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <span className="text-2xl font-semibold text-primary-foreground">Swift-Invoice</span>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-primary-foreground leading-tight text-balance">
            Professional invoicing made simple for Indian businesses
          </h1>
          <p className="text-lg text-primary-foreground/80 leading-relaxed">
            Create GST-compliant invoices, track payments, and manage your business finances with ease.
          </p>
          <div className="flex gap-8 pt-4">
            <div>
              <p className="text-3xl font-bold text-primary-foreground">10K+</p>
              <p className="text-sm text-primary-foreground/70">Active Users</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary-foreground">50L+</p>
              <p className="text-sm text-primary-foreground/70">Invoices Created</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary-foreground">99.9%</p>
              <p className="text-sm text-primary-foreground/70">Uptime</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-primary-foreground/60">
          Trusted by freelancers and businesses across India
        </p>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
              <FileText className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-semibold">Swift-Invoice</span>
          </div>

          <Card className="border-0 shadow-none lg:shadow-sm lg:border">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={formAction} className="space-y-4">
                {isRegistered && (
                  <p className="text-sm text-center text-emerald-600">
                    Account created. Verify your email using the OTP sent to your inbox.
                  </p>
                )}

                {isVerified && (
                  <p className="text-sm text-center text-emerald-600">
                    Email verified successfully. You can sign in now.
                  </p>
                )}

                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@company.com"
                      required
                      autoComplete="email"
                      disabled={isPending}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      disabled={isPending}
                    />
                  </Field>
                </FieldGroup>

                {state.error && (
                  <FieldError className="text-center">{state.error}</FieldError>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Spinner className="mr-2" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                {"Don't have an account? "}
                <Link 
                  href="/signup" 
                  className="font-medium text-primary hover:underline"
                >
                  Start your free trial
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
