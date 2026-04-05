"use client"

import { useState } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

type BusinessSettings = {
  name?: string | null
  legal_name?: string | null
  display_name?: string | null
  business_type?: string | null
  website_url?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  gst_number?: string | null
  logo_url?: string | null
  bank_account_number?: string | null
  bank_ifsc?: string | null
  bank_name?: string | null
  bank_branch?: string | null
  bank_account_holder?: string | null
  signatory_name?: string | null
  signatory_mobile?: string | null
  signatory_email?: string | null
  signatory_designation?: string | null
}

interface BusinessSettingsFormProps {
  action: (formData: FormData) => void
  business: BusinessSettings | null
}

const BUSINESS_TYPES = [
  "Proprietorship",
  "Partnership",
  "LLP",
  "Private Limited",
  "Public Limited",
  "OPC",
  "Trust",
  "Society",
  "Other",
]

export function BusinessSettingsForm({ action, business }: BusinessSettingsFormProps) {
  const [logoUrl, setLogoUrl] = useState(business?.logo_url || "")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return

    setUploadError("")

    const isValidType = ["image/png", "image/jpeg", "image/jpg"].includes(file.type)
    if (!isValidType) {
      setUploadError("Only JPG and PNG files are allowed")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size should be under 5MB")
      return
    }

    try {
      setIsUploading(true)
      const data = new FormData()
      data.append("file", file)

      const response = await fetch("/api/upload/logo", {
        method: "POST",
        body: data,
      })

      const result = (await response.json()) as { logoUrl?: string; error?: string }

      if (!response.ok || !result.logoUrl) {
        setUploadError(result.error || "Failed to upload logo")
        return
      }

      setLogoUrl(result.logoUrl)
    } catch {
      setUploadError("Unable to upload logo right now")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="logoUrl" value={logoUrl} />

      <div className="space-y-1 md:col-span-2">
        <Label htmlFor="businessName">Business Name (Legal + Display)</Label>
        <Input id="businessName" name="businessName" required defaultValue={business?.name || ""} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="legalName">Legal Name</Label>
        <Input id="legalName" name="legalName" defaultValue={business?.legal_name || ""} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="displayName">Display Name</Label>
        <Input id="displayName" name="displayName" defaultValue={business?.display_name || ""} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="businessType">Business Type</Label>
        <select
          id="businessType"
          name="businessType"
          defaultValue={business?.business_type || ""}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
        >
          <option value="">Select business type</option>
          {BUSINESS_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="gstNumber">GST Number</Label>
        <Input id="gstNumber" name="gstNumber" defaultValue={business?.gst_number || ""} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="phone">Business Phone</Label>
        <Input id="phone" name="phone" defaultValue={business?.phone || ""} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">Business Email</Label>
        <Input id="email" name="email" type="email" defaultValue={business?.email || ""} />
      </div>

      <div className="space-y-1 md:col-span-2">
        <Label htmlFor="websiteUrl">Website</Label>
        <Input id="websiteUrl" name="websiteUrl" defaultValue={business?.website_url || ""} />
      </div>

      <div className="space-y-1 md:col-span-2">
        <Label htmlFor="address">Business Address</Label>
        <Input id="address" name="address" defaultValue={business?.address || ""} />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label>Logo (JPG or PNG)</Label>
        <div className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center">
          <Input
            id="logoFile"
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            onChange={(event) => {
              void handleLogoUpload(event.target.files?.[0] || null)
            }}
            disabled={isUploading}
            className="sm:max-w-sm"
          />
          {isUploading && <span className="text-sm text-muted-foreground">Uploading logo...</span>}
          {logoUrl && (
            <div className="relative h-14 w-14 overflow-hidden rounded border bg-background">
              <Image src={logoUrl} alt="Business logo" fill className="object-contain" />
            </div>
          )}
        </div>
        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
      </div>

      <div className="md:col-span-2">
        <h3 className="text-sm font-semibold">Bank Details</h3>
      </div>

      <div className="space-y-1">
        <Label htmlFor="bankAccountHolder">Account Holder Name</Label>
        <Input id="bankAccountHolder" name="bankAccountHolder" defaultValue={business?.bank_account_holder || ""} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="bankName">Bank Name</Label>
        <Input id="bankName" name="bankName" defaultValue={business?.bank_name || ""} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="bankAccountNumber">Account Number</Label>
        <Input id="bankAccountNumber" name="bankAccountNumber" defaultValue={business?.bank_account_number || ""} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="bankIfsc">IFSC Code</Label>
        <Input id="bankIfsc" name="bankIfsc" defaultValue={business?.bank_ifsc || ""} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="bankBranch">Branch</Label>
        <Input id="bankBranch" name="bankBranch" defaultValue={business?.bank_branch || ""} />
      </div>

      <div className="md:col-span-2">
        <h3 className="text-sm font-semibold">Signatory Details</h3>
      </div>

      <div className="space-y-1">
        <Label htmlFor="signatoryName">Signatory Name</Label>
        <Input id="signatoryName" name="signatoryName" defaultValue={business?.signatory_name || ""} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="signatoryMobile">Signatory Mobile</Label>
        <Input id="signatoryMobile" name="signatoryMobile" defaultValue={business?.signatory_mobile || ""} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="signatoryEmail">Signatory Email</Label>
        <Input id="signatoryEmail" name="signatoryEmail" type="email" defaultValue={business?.signatory_email || ""} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="signatoryDesignation">Designation</Label>
        <Input id="signatoryDesignation" name="signatoryDesignation" defaultValue={business?.signatory_designation || ""} />
      </div>

      <Button type="submit" className="w-fit md:col-span-2" disabled={isUploading}>
        Save Business Settings
      </Button>
    </form>
  )
}
