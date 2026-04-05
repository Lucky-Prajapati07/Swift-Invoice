"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signUpAction, type AuthState } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { FileText, ArrowRight, Check } from "lucide-react"

const initialState: AuthState = {}

const features = [
  "30-day free trial, no credit card required",
  "GST-compliant invoices with CGST, SGST, IGST",
  "Unlimited clients and invoice templates",
  "Automated payment reminders",
  "Detailed financial reports and analytics",
]

export default function SignupPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(signUpAction, initialState)

  useEffect(() => {
    if (state.success) {
      router.push(state.redirectTo || "/login?registered=true")
    }
  }, [state.success, state.redirectTo, router])

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
        
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-primary-foreground leading-tight text-balance">
              Start invoicing like a pro in minutes
            </h1>
            <p className="text-lg text-primary-foreground/80 leading-relaxed">
              Join thousands of Indian businesses who trust Swift-Invoice for their billing needs.
            </p>
          </div>
          
          <ul className="space-y-4">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-foreground/20">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-primary-foreground/90">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-primary-foreground/60">
          Trusted by freelancers and businesses across India
        </p>
      </div>

      {/* Right side - Signup form */}
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
              <CardTitle className="text-2xl font-semibold">Create your account</CardTitle>
              <CardDescription>
                Get started with your 30-day free trial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={formAction} className="space-y-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="name">Full Name</FieldLabel>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="John Doe"
                      required
                      autoComplete="name"
                      disabled={isPending}
                    />
                  </Field>

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
                    <FieldLabel htmlFor="businessName">Business Name</FieldLabel>
                    <Input
                      id="businessName"
                      name="businessName"
                      type="text"
                      placeholder="Acme Solutions Pvt. Ltd."
                      required
                      disabled={isPending}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Minimum 8 characters"
                      required
                      autoComplete="new-password"
                      minLength={8}
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
                      Creating account...
                    </>
                  ) : (
                    <>
                      Start free trial
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By signing up, you agree to our{" "}
                  <Link href="/terms" className="underline hover:text-foreground">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline hover:text-foreground">
                    Privacy Policy
                  </Link>
                </p>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link 
                  href="/login" 
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
