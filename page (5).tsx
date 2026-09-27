'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

const signupSchema = z.object({
  full_name: z.string().min(2, 'Please enter your full name'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirm_password: z.string(),
  terms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})
type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  async function onSubmit(data: SignupForm) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)

    if (error) {
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' })
      return
    }

    router.push('/auth/verify-email?email=' + encodeURIComponent(data.email))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <ShieldCheck className="h-8 w-8 text-gold-500" />
            <span className="text-2xl font-bold text-white">ITIN Plus</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-navy-200 mt-1">Start your ITIN application — takes 5 minutes</p>
        </div>

        <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" placeholder="As on your passport" {...register('full_name')} />
              {errors.full_name && <p className="text-destructive text-sm">{errors.full_name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  className="pr-10"
                  {...register('password')}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm password</Label>
              <Input id="confirm_password" type="password" placeholder="Repeat your password"
                {...register('confirm_password')} />
              {errors.confirm_password && <p className="text-destructive text-sm">{errors.confirm_password.message}</p>}
            </div>

            <div className="flex items-start gap-3">
              <input id="terms" type="checkbox" {...register('terms')}
                className="mt-1 h-4 w-4 accent-navy-900" />
              <label htmlFor="terms" className="text-sm text-muted-foreground">
                I agree to the{' '}
                <Link href="https://itinplus.com/terms.html" target="_blank" className="text-primary hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="https://itinplus.com/privacy-policy.html" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>
              </label>
            </div>
            {errors.terms && <p className="text-destructive text-sm">{errors.terms.message}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating account…</> : 'Create Account — Free'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>

        <p className="text-center text-xs text-navy-300 mt-6">
          Your data is encrypted and never shared.
        </p>
      </div>
    </div>
  )
}
