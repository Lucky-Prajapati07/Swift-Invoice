"use client"

import { Suspense, useActionState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { verifyEmailOtpAction, resendEmailOtpAction, type AuthState } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"

const initialState: AuthState = {}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <VerifyEmailPageContent />
    </Suspense>
  )
}

function VerifyEmailPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = (searchParams.get("email") || "").trim().toLowerCase()

  const [verifyState, verifyAction, isVerifying] = useActionState(verifyEmailOtpAction, initialState)
  const [resendState, resendAction, isResending] = useActionState(resendEmailOtpAction, initialState)

  useEffect(() => {
    if (verifyState.success && verifyState.redirectTo) {
      router.push(verifyState.redirectTo)
    }
  }, [verifyState.success, verifyState.redirectTo, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Verify your email</CardTitle>
            <CardDescription>
              Enter the 6-digit OTP sent to {email || "your email"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={verifyAction} className="space-y-4">
              <input type="hidden" name="email" value={email} />

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="otp">OTP code</FieldLabel>
                  <Input
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    placeholder="123456"
                    required
                    maxLength={6}
                    disabled={isVerifying || !email}
                  />
                </Field>
              </FieldGroup>

              {verifyState.error && <FieldError className="text-center">{verifyState.error}</FieldError>}
              {verifyState.message && !verifyState.error && (
                <p className="text-sm text-center text-emerald-600">{verifyState.message}</p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={isVerifying || !email}>
                {isVerifying ? (
                  <>
                    <Spinner className="mr-2" />
                    Verifying...
                  </>
                ) : (
                  "Verify email"
                )}
              </Button>
            </form>

            <form action={resendAction} className="space-y-3">
              <input type="hidden" name="email" value={email} />

              {resendState.error && <FieldError className="text-center">{resendState.error}</FieldError>}
              {resendState.message && !resendState.error && (
                <p className="text-sm text-center text-emerald-600">{resendState.message}</p>
              )}

              <Button type="submit" variant="outline" className="w-full" disabled={isResending || !email}>
                {isResending ? (
                  <>
                    <Spinner className="mr-2" />
                    Sending OTP...
                  </>
                ) : (
                  "Resend OTP"
                )}
              </Button>
            </form>

            <p className="text-sm text-center text-muted-foreground">
              Back to <Link href="/login" className="underline hover:text-foreground">Login</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
